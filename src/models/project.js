const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    last_scrap: {
        type: Number,
        default: 0
    },
    url: {
        type: String,
        trim: true
    },
    project: {
        type: String,
        trim: true
    },
    page: {
        type: String,
        trim: true,
        unique: true
    },
    members: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    updated: {
        type: String,
        trim: true
    },
    created: {
        type: String,
        trim: true
    },
    session_type: {
        type: String,
        trim: true
    },
    moods: [{}],
    styles: [{}],
    admins: [{}],
    contributors: [{}]
});

const Project = mongoose.model('Project', projectSchema);

module.exports = {
    Project
};