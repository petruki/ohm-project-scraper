const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
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
        trim: true
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
    admins: [{}],
    contributors: [{}]
});

const Project = mongoose.model('Project', projectSchema);

module.exports = {
    Project
};