const request = require('request');
const cheerio = require('cheerio');
const { Project } = require('./models/project');
require('./db/mongoose');

function scrapPage(data) {
    const $ = cheerio.load(data);
    const result = {
        admins: [],
        contributors: []
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
                    const result = scrapPage(response.body);
                    return resolve(result);
                }
            }
        );
    });
}

async function updateProjects() {
    const projects = await Project.find();
    for (let i = 0; i < projects.length; i++) {
        console.log(`Updating: ${projects[i].page}`)
        await fetchPage(projects[i].page)
            .then(data => {
                console.log(data)
                projects[i].admins = data.admins;
                projects[i].contributors = data.contributors;
                projects[i].save();
            }).catch((e) => console.log(e));
    }
}

// Starts execution
updateProjects().finally(() => process.exit());