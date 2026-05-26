const mongoose = require('mongoose');

const batalhaSchema = new mongoose.Schema({
    nome:         { type: String, required: true, trim: true },
    descricao:    { type: String, default: null },
    local:        { type: String, default: null },
    data:         { type: Date, default: null },
    participantes:[{ type: mongoose.Schema.Types.ObjectId, ref: 'MC' }],
    confrontos:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Confronto' }],
    faseAtual:    { type: String, default: null },
    status:       { type: String, default: 'criada' },
    campeao:      { type: mongoose.Schema.Types.ObjectId, ref: 'MC', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Batalha', batalhaSchema);
