const request = require('request');
const cheerio = require('cheerio');
const { Project } = require('./models/project');
require('./db/mongoose');

function scrapPage(data) {
    const $ = cheerio.load(data);
    const result = {
        admins: [],
        contributors: [],
        comments: [],
        styles: [],
        moods: []
    }

    //load admins
    let content = $('div.owner').children('a');
    content.each((index, elem) => {
        if (elem.children[0].data)
            result.admins.push(elem.children[0].data);
    });

    //load contributors
    content = $('#session-data-sidebar').children('a');
    content.each((index, elem) => {
        if (elem.children[0].attribs.title)
            result.contributors.push(elem.children[0].attribs.title);
    });

    //load comments
    let comment;
    content = $('div.comment-thread').children();
    content.each((index, elem) => {
        comment = {};
        comment.author = elem.children[0].parent.children[1].attribs.title;

        if (comment.author) {
            comment.date = elem.parent.children[3].children[3].children[1].children[0].data.trim();
            comment.content = elem.parent.children[3].children[7].children[0].data.trim();
            result.comments.push(comment);
        }
    });

    let skipParentDiv = 0;
    content = $('h2.pane-title').next('.pane-content');
    if (content.children()[0].parent.parent.children[1].children[0].data === 'Parent') {
        skipParentDiv = 1;
    }

    //load styles
    content = $('h2.pane-title').next('.pane-content');
    content.children()[skipParentDiv].children.forEach(elem => {
        if (elem.children && elem.children.length && elem.children[0].name === 'a') {
            result.styles.push(elem.children[0].children[0].data);
        }
    });

    //load moods
    content = $('h2.pane-title').next('.pane-content');
    if (content.children()[skipParentDiv + 1]) {
        content.children()[skipParentDiv + 1].children.forEach(elem => {
            if (elem.children && elem.children.length && elem.children[0].name === 'a') {
                result.moods.push(elem.children[0].children[0].data);
            }
        });
    }
    
    //load description
    content = $('h2.pane-title').next('.pane-content');
    if (content.children()[skipParentDiv + 3]) {
        if (content.children()[skipParentDiv + 3].children.length > 1) {
            result.description = content.children()[skipParentDiv + 3].children[1].children[1].children[0].data.trim();
        } else {
            result.description = content.children()[skipParentDiv + 3].children[0].data.trim();
        }
    }

    return result;
}

function fetchPage(profile) {
    const defaultOptions = {
        url: `http://www.ohmstudio.com${profile}`,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:34.0) Gecko/20100101 Firefox/34.0',
            Cookie: process.env.COOKIE
        }
    };

    return new Promise((resolve, reject) => {
        request(
            Object.assign({}, defaultOptions, {}),
            (error, response, body) => {
                if (error) {
                    return reject(`Error making the request: ${error}`, null);
                }

                if (response.body) {
                    let result;
                    try {
                        result = scrapPage(response.body);
                    } catch (e) {
                        console.log(`Error updating: ${profile}`, e);
                    } finally {
                        return resolve(result);
                    }
                }
            }
        );
    });
}

async function updateProjects() {
    console.log(`Connecting to DB`);
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log(`Quering documents...`);
    let projects = await Project.find({ last_scrap: 0 });

    console.log(`Starting to update ${projects.length} documents...`);
    for (let i = 0; i < projects.length; i++) {
        await fetchPage(projects[i].page)
            .then(async (data) => {
                projects[i].last_scrap = Date.now();
                projects[i].admins = data.admins;
                projects[i].contributors = data.contributors;
                projects[i].comments = data.comments;
                projects[i].styles = data.styles;
                projects[i].moods = data.moods;
                projects[i].description = data.description;
                await projects[i].save();
            })
            .catch((e) => console.log(e))
            .finally(() => console.log(`Successfully updated ${projects[i].page} - ${projects.length - i} remaining`));
    }
}

// Starts execution
updateProjects().finally(() => process.exit());

// For testing
// fetchPage('/node/277187')
//     .then(data => {
//         console.log(data)
//     }).catch((e) => console.log(e)).finally(() => process.exit());