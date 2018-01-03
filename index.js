const https = require('https');
var open = require("open");

function rootify(str) {
  str.replace(/-\w/g, (x)=> { return x.toUpperCase() })
  .split('-')
  .join('');
}

const repos = [
  'if-ross-wrote-javascript', 
  'i-have-issues', 
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
    'User-Agent': ' rosschapman@github'
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
    console.log(resBody)
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postBody);
req.end();
