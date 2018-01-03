const https = require('https');
const fs = require('fs');
const opn = require('opn');
const dust = require('dustjs-linkedin');

const template = fs.readFileSync(process.cwd() + '/app/issues.dust', 'utf8');

function rootify(str) {
  return str.replace(/-\w/g, (x)=> { return x.toUpperCase() })
  .split('-')
  .join('');
}

function parseIssueGraph(dataStr) {
  const parsedData = JSON.parse(dataStr);
  const repoKeys = Object.keys(parsedData.data.viewer);
  let result;
  let arryOfIssues = [];

  repoKeys.forEach((key) => {
    let nextArr = parsedData.data.viewer[key].issues.edges;
    arryOfIssues = arryOfIssues.concat(nextArr);
  });

  result = arryOfIssues.map((el)=> {
    el.issue.labels = el.issue.labels.edges;
    return el.issue;
  });

  return { issues: result };
}

function handleResponse(res) {
  const htmlStart = '<html><body>';
  const htmlEnd = '</body></html>';
  const resAsJson = res;
  const data = parseIssueGraph(resAsJson);

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
    issue: node {
      id
      title
      createdAt
      number
      repository {
        name
      }
      labels(last: 100) {
        edges {
          label: node {
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
  res.setEncoding('utf8');
  let resBody = '';

  res.on('data', (chunk) => {
    resBody += chunk;
  });

  res.on('end', () => {
    handleResponse(resBody);
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postBody);
req.end();