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
                        if (response.statusCode === 404) {
                            return reject({ code: 404 }, null);
                        } else {
                            result = scrapPage(response.body);
                        }
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
    // all
    // let projects = await Project.find({});

    // by date
    let projects = await Project.find({ last_scrap: { $lt: new Date().setFullYear(2020, 11, 29).valueOf() } });

    // by first scraping
    // let projects = await Project.find({ last_scrap: 0 });

    console.log(`Starting to update ${projects.length} documents...`);
    for (let i = 0; i < projects.length; i++) {
        await fetchPage(projects[i].page)
            .then(async (data) => {
                Object.keys(data).forEach((key) => projects[i][key] = data[key]);
                projects[i].last_scrap = Date.now();
                await projects[i].save();
            })
            .catch(async (e) => {
                if (e.code && e.code == 404) {
                    console.log(`Project not found - ${projects[i].page}`);
                    await projects[i].remove();
                } else {
                    console.log(e);
                }
            }).finally(() => 
                console.log(`Successfully updated ${projects[i].page} - ${projects.length - i} remaining`));
    }
}

// Scrape details
updateProjects().finally(() => process.exit());

// Fetch single project
// fetchPage('/node/653663')
//     .then(data => {
//         console.log(data)
//     }).catch((e) => {
//         if (e.code && e.code == 404) {
//             console.log('Project not found - Delme');
//         } else {
//             console.log(e)
//         }
//     }).finally(() => process.exit());