const mongoose = require('mongoose');

const confrontoSchema = new mongoose.Schema({
    mc1:     { type: mongoose.Schema.Types.ObjectId, ref: 'MC', required: true },
    mc2:     { type: mongoose.Schema.Types.ObjectId, ref: 'MC', default: null },
    vencedor:{ type: mongoose.Schema.Types.ObjectId, ref: 'MC', default: null },
    fase:    { type: String, required: true },
    votos: {
        mc1: { type: Number, default: 0 },
        mc2: { type: Number, default: 0 },
    }
}, { timestamps: true });

module.exports = mongoose.model('Confronto', confrontoSchema);
