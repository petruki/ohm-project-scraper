const request = require('request');
const cheerio = require('cheerio');
const { Project } = require('./models/project');
require('./db/mongoose');

function scrapPage(data) {
    const $ = cheerio.load(data);
    const result = [];

    //load entries
    let content = $('div.miniplayer').children('a');
    content.each((index, elem) => {
        result.push({
            url: elem.attribs.href
        });
    });

    //load project name and url page
    content =  $('div.project-name')
        .children('span.field-content')
        .children('a');

    content.each((index, elem) => {
        if (result[index].url) {
            result[index].project = elem.children[0].data;
            result[index].page = elem.attribs.href;
        }
    });

    //load num of members
    content =  $('div.member-count')
        .children('span.field-content')
        .children('a');

    content.each((index, elem) => {
        result[index].members = elem.children[0].data;
    });

    //load description
    content = $('div.short-desc').children('span.field-content');
    content.each((index, elem) => {
        result[index].description = elem.children[0].data;
    });

    //load modification date
    content = $('div.update-date').children('span.field-content');
    content.each((index, elem) => {
        result[index].updated = elem.children[0].data;
    });

    //load creation date
    content = $('div.creation-date').children('span.field-content');
    content.each((index, elem) => {
        result[index].created = elem.children[0].data;
    });

    //load moods
    content = $('div.mood-tags').children('span.field-content');
    content.each((index, elem) => {
        result[index].moods = elem.children[0].parent.children.map(a => {
            if (a.children && a.children[0])
                return a.children[0].data;
        }).filter(e => e);
    });

    //load session type
    content = $('div.permissions').children('span.field-content');
    content.each((index, elem) => {
        result[index].session_type = elem.children[0].children[0].data;
    });

    return result;
}

function fetchPage(view_alias, page) {

    const defaultOptions = {
        url: `http://www.ohmstudio.com/dash/list?view_alias=${view_alias}&page=${page}`,
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

                if (response.statusCode !== 200 || !response.toJSON().body) {
                    return reject(`Cookie might be invalid`, null);
                } else {
                    const meta = JSON.parse(response.toJSON().body).pager;
                    const result = scrapPage(JSON.parse(response.toJSON().body).html);
                    // console.log(result);
                    console.log(meta);
                    
                    Project.insertMany(result);
                    fetchPage('online_projects', ++page).catch((e) => console.log(e));
                }
            }
        );
    });
}

// Starts execution
fetchPage('online_projects', 0).catch((e) => console.log(e));