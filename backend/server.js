require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const conectar = require('./db');
const Batalha  = require('./models/Batalha');
const Confronto= require('./models/Confronto');
const MC       = require('./models/MC');

const app = express();
app.use(cors());
app.use(express.json());

conectar();

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function definirNomeFase(n) {
    if (n > 8)  return 'oitavas';
    if (n > 4)  return 'quartas';
    if (n === 4) return 'semifinal';
    if (n === 2) return 'final';
    return 'fase_custom';
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ─────────────────────────────────────────
// MCs
// ─────────────────────────────────────────

// Cadastrar MC
app.post('/mcs', async (req, res) => {
    try {
        const { nomeArtistico, nomeReal, bairro, cidade, estilo, bio } = req.body;
        if (!nomeArtistico) return res.status(400).send('nomeArtistico é obrigatório');
        const mc = new MC({ nomeArtistico, nomeReal, bairro, cidade, estilo, bio });
        await mc.save();
        res.status(201).json(mc);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Listar MCs
app.get('/mcs', async (req, res) => {
    try {
        const mcs = await MC.find().sort({ nomeArtistico: 1 });
        res.json(mcs);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Perfil de um MC com histórico
app.get('/mcs/:id', async (req, res) => {
    try {
        const mc = await MC.findById(req.params.id);
        if (!mc) return res.status(404).send('MC não encontrado');

        const confrontos = await Confronto.find({
            $or: [{ mc1: mc._id }, { mc2: mc._id }],
            vencedor: { $ne: null }
        }).populate('mc1 mc2 vencedor');

        res.json({ mc, confrontos });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Atualizar MC
app.put('/mcs/:id', async (req, res) => {
    try {
        const mc = await MC.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!mc) return res.status(404).send('MC não encontrado');
        res.json(mc);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Deletar MC
app.delete('/mcs/:id', async (req, res) => {
    try {
        const mc = await MC.findByIdAndDelete(req.params.id);
        if (!mc) return res.status(404).send('MC não encontrado');
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ─────────────────────────────────────────
// BATALHAS (TORNEIOS)
// ─────────────────────────────────────────

// Criar torneio
app.post('/batalhas', async (req, res) => {
    try {
        const { nome, descricao, local, data } = req.body;
        if (!nome) return res.status(400).send('nome é obrigatório');
        const batalha = new Batalha({ nome, descricao, local, data });
        await batalha.save();
        res.status(201).json(batalha);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Adicionar MC ao torneio (por ID)
app.post('/batalhas/:id/participantes', async (req, res) => {
    try {
        const batalha = await Batalha.findById(req.params.id);
        if (!batalha) return res.status(404).send('Batalha não encontrada');
        if (batalha.status !== 'criada') return res.status(400).send('Inscrições fechadas');

        const { mcId } = req.body;
        const mc = await MC.findById(mcId);
        if (!mc) return res.status(404).send('MC não encontrado');

        const jaInscrito = batalha.participantes.some(p => p.toString() === mcId);
        if (jaInscrito) return res.status(400).send('MC já inscrito');

        batalha.participantes.push(mc._id);
        await batalha.save();
        await batalha.populate('participantes');
        res.json(batalha.participantes);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Gerar chaveamento
app.post('/batalhas/:id/gerar', async (req, res) => {
    try {
        const batalha = await Batalha.findById(req.params.id);
        if (!batalha) return res.status(404).send('Batalha não encontrada');
        if (batalha.participantes.length < 2) return res.status(400).send('Mínimo 2 participantes');

        await Confronto.deleteMany({ _id: { $in: batalha.confrontos } });
        batalha.confrontos = [];

        const participantes = shuffle(batalha.participantes);
        const faseInicial   = definirNomeFase(participantes.length);
        batalha.faseAtual   = faseInicial;
        batalha.status      = 'em_andamento';

        for (let i = 0; i < participantes.length; i += 2) {
            const mc1 = participantes[i];
            const mc2 = participantes[i + 1] || null;
            const vencedorAutomatico = mc2 === null ? mc1 : null;

            const confronto = new Confronto({ mc1, mc2, vencedor: vencedorAutomatico, fase: faseInicial });
            await confronto.save();
            batalha.confrontos.push(confronto._id);
        }

        await batalha.save();
        const confrontos = await Confronto.find({ _id: { $in: batalha.confrontos } }).populate('mc1 mc2 vencedor');
        res.json(confrontos);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Avançar fase / checar campeão
app.post('/batalhas/:id/proxima-fase', async (req, res) => {
    try {
        const batalha = await Batalha.findById(req.params.id).populate('confrontos');
        if (!batalha) return res.status(404).send('Batalha não encontrada');

        const confrontosDaFase = batalha.confrontos.filter(c => c.fase === batalha.faseAtual);
        const todosFinalizados = confrontosDaFase.every(c => c.vencedor !== null);
        if (!todosFinalizados) return res.status(400).send('Ainda existem confrontos sem resultado');

        const vencedores = confrontosDaFase.map(c => c.vencedor);

        if (batalha.faseAtual === 'final' && vencedores.length === 1) {
            batalha.campeao = vencedores[0];
            batalha.status  = 'finalizada';
            await MC.findByIdAndUpdate(vencedores[0], { $inc: { vitorias: 1 } });
            await batalha.save();
            await batalha.populate('campeao');
            return res.json({ mensagem: 'Batalha finalizada! Temos um campeão!', campeao: batalha.campeao, batalha });
        }

        const proximaFase  = definirNomeFase(vencedores.length);
        batalha.faseAtual  = proximaFase;
        const novosConfrontos = [];

        for (let i = 0; i < vencedores.length; i += 2) {
            const mc1 = vencedores[i];
            const mc2 = vencedores[i + 1] || null;
            const vencedorAutomatico = mc2 === null ? mc1 : null;

            const confronto = new Confronto({ mc1, mc2, vencedor: vencedorAutomatico, fase: proximaFase });
            await confronto.save();
            batalha.confrontos.push(confronto._id);
            novosConfrontos.push(confronto);
        }

        await batalha.save();
        const populados = await Confronto.find({ _id: { $in: novosConfrontos.map(c => c._id) } }).populate('mc1 mc2 vencedor');
        res.json({ proximaFase: batalha.faseAtual, novosConfrontos: populados });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Listar torneios
app.get('/batalhas', async (req, res) => {
    try {
        const batalhas = await Batalha.find().sort({ createdAt: -1 }).populate('campeao');
        res.json(batalhas);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Ver torneio completo com bracket
app.get('/batalhas/:id', async (req, res) => {
    try {
        const batalha = await Batalha.findById(req.params.id)
            .populate('participantes')
            .populate({ path: 'confrontos', populate: { path: 'mc1 mc2 vencedor' } })
            .populate('campeao');
        if (!batalha) return res.status(404).send('Batalha não encontrada');
        res.json(batalha);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Atualizar torneio (nome, descricao, local, data)
app.put('/batalhas/:id', async (req, res) => {
    try {
        const { nome, descricao, local, data } = req.body;
        const batalha = await Batalha.findByIdAndUpdate(
            req.params.id,
            { nome, descricao, local, data },
            { new: true }
        );
        if (!batalha) return res.status(404).send('Batalha não encontrada');
        res.json(batalha);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Deletar torneio e seus confrontos
app.delete('/batalhas/:id', async (req, res) => {
    try {
        const batalha = await Batalha.findById(req.params.id);
        if (!batalha) return res.status(404).send('Batalha não encontrada');
        await Confronto.deleteMany({ _id: { $in: batalha.confrontos } });
        await batalha.deleteOne();
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ─────────────────────────────────────────
// CONFRONTOS
// ─────────────────────────────────────────

// Ver confronto individual com votos
app.get('/confrontos/:id', async (req, res) => {
    try {
        const confronto = await Confronto.findById(req.params.id).populate('mc1 mc2 vencedor');
        if (!confronto) return res.status(404).send('Confronto não encontrado');
        res.json(confronto);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Votar em um MC (sem autenticação)
app.post('/confrontos/:id/votar', async (req, res) => {
    try {
        const { mcId } = req.body;
        const confronto = await Confronto.findById(req.params.id);
        if (!confronto) return res.status(404).send('Confronto não encontrado');
        if (confronto.vencedor) return res.status(400).send('Este confronto já foi encerrado');

        if (confronto.mc1?.toString() === mcId) {
            confronto.votos.mc1 += 1;
        } else if (confronto.mc2?.toString() === mcId) {
            confronto.votos.mc2 += 1;
        } else {
            return res.status(400).send('MC não pertence a este confronto');
        }

        await confronto.save();
        await confronto.populate('mc1 mc2');
        res.json({ votos: confronto.votos, confronto });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// Registrar vencedor oficial (pelo organizador)
app.put('/confrontos/:id/vencedor', async (req, res) => {
    try {
        const { mcId } = req.body;
        const confronto = await Confronto.findById(req.params.id).populate('mc1 mc2');
        if (!confronto) return res.status(404).send('Confronto não encontrado');

        const mc1id = confronto.mc1?._id?.toString();
        const mc2id = confronto.mc2?._id?.toString();
        if (mcId !== mc1id && mcId !== mc2id) return res.status(400).send('MC não pertence a este confronto');

        const perdedorId = mcId === mc1id ? mc2id : mc1id;
        await MC.findByIdAndUpdate(mcId, { $inc: { vitorias: 1 } });
        if (perdedorId) await MC.findByIdAndUpdate(perdedorId, { $inc: { derrotas: 1 } });

        confronto.vencedor = mcId;
        await confronto.save();
        await confronto.populate('vencedor');
        res.json(confronto);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ─────────────────────────────────────────
// STATS (para o contador da home)
// ─────────────────────────────────────────
app.get('/stats', async (req, res) => {
    try {
        const [totalMcs, totalBatalhas, totalVotos] = await Promise.all([
            MC.countDocuments(),
            Batalha.countDocuments(),
            Confronto.aggregate([
                { $group: { _id: null, total: { $sum: { $add: ['$votos.mc1', '$votos.mc2'] } } } }
            ])
        ]);
        res.json({
            mcs: totalMcs,
            batalhas: totalBatalhas,
            votos: totalVotos[0]?.total ?? 0
        });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.listen(3000, () => console.log('Servidor RhymArea rodando na porta 3000 🎤🔥'));