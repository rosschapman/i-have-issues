const https = require('https');
const fs = require('fs');
const opn = require('opn');
const dust = require('dustjs-linkedin');

const template = `<ul>{#issues}<li>{#node}{title}{/node}</li>{/issues}</ul>`

function rootify(str) {
  return str.replace(/-\w/g, (x)=> { return x.toUpperCase() })
  .split('-')
  .join('');
}

function handleResponse(res) {
  const htmlStart = '<html><body>';
  const htmlEnd = '</body></html>';
  const parsed = JSON.parse(res);
  const repoKeys = Object.keys(parsed.data.viewer);
  let data = { "issues": parsed.data.viewer[repoKeys[0]].issues.edges.concat(parsed.data.viewer[repoKeys[1]].issues.edges)};

  const compiled = dust.compile(template, 'template');
  dust.loadSource(compiled);
  dust.render('template', data, function(err, out) {
    const html = htmlStart + out + htmlEnd;
    fs.writeFile('issues.html', html, 'utf8', (err)=> {
      if (err) throw err;
      console.log('The file has been saved!');
      opn('./issues.html', 'firefox');
    });
  });
}

const repos = [
  'if-ross-wrote-javascript',
  'my-theory-of-dev'
];

const issuesQueryFrag = `issues(last: 100, states: OPEN) {
  edges {
    node {
      id
      title
      createdAt
      number
      labels(last: 100) {
        edges {
          node {
            id
            name
            color
          }
        }
      }
    }
  }
}`;

const query = repos.reduce((acc, el) => {
  let elRootKey = rootify(el);
    
  return acc + `${elRootKey}: repository(name: "${el}") {${issuesQueryFrag}},`
}, '');

const postBody = JSON.stringify({
  query: `{ viewer { ${query} }}`
});

const options = {
  hostname: 'api.github.com',
  path: '/graphql',
  port: 443,
  method: 'POST',
  headers: {
    Authorization: ` Bearer ${process.env.GITHUB_TOKEN}`,
    'User-Agent': ' rosschapman'
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  let resBody = '';

  res.on('data', (chunk) => {
    resBody += chunk;
  });

  res.on('end', () => {
    const result = handleResponse(resBody);
    console.log(result);
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postBody);
req.end();
