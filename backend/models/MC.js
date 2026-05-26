const mongoose = require('mongoose');

const mcSchema = new mongoose.Schema({
    nomeArtistico: { type: String, required: true, trim: true },
    nomeReal:      { type: String, default: null, trim: true },
    bairro:        { type: String, default: null, trim: true },
    cidade:        { type: String, default: null, trim: true },
    estilo:        { type: String, default: null, trim: true },
    bio:           { type: String, default: null, trim: true },
    vitorias:      { type: Number, default: 0 },
    derrotas:      { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MC', mcSchema);
