'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai').expect;
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

let app = express();

app.use('/public', express.static(process.cwd() + '/public'));
app.use(cors({ origin: '*' })); //For FCC testing purposes only

//for getting values from form using req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

//database connection
const mongoURI = process.env.MONGO_URI
if (!mongoURI) {
  throw new Error('Mongo URI is not defined')
}
const client = new MongoClient(mongoURI);

const db = client.db('issueTracker')
const projects = db.collection('projects')
const issues = db.collection('issues')

function getOpenStatus(open) {
  if (open === undefined) {
    return open;
  } else if (open === true) {
    return true
  } else if (open === false) {
    return false
  } else if (open.toLowerCase() === 'true') {
    return true
  } else if (open.toLowerCase() === 'false') {
    return false
  }
}

//Sample front-end
app.route('/:project/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/issue.html');
  });

//Index page (static HTML)
app.route('/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

//post issue to /api/issues/{projectname}
app.post('/api/issues/:project/', async (req, res) => {
  const projectName = req.params.project;
  const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;

  if (!issue_title || !issue_text || !created_by) {
    return res.json({ error: 'required field(s) missing' })
  }

  let existingProject = await projects.findOne({ name: projectName });

  if (!existingProject) {
    console.log('Project ' + projectName + ' does not exists. Creating one...');
    await projects.insertOne({ name: projectName })
    existingProject = await projects.findOne({ name: projectName });
  }

  const newIssue = await issues.insertOne({
    project_id: existingProject._id,
    issue_title, issue_text, created_by, assigned_to, status_text,
    open: true,
    created_on: new Date(),
    updated_on: new Date()
  })

  const justCreatedIssue = await issues.findOne({ _id: new ObjectId(newIssue.insertedId) })

  return res.json(justCreatedIssue);

})

app.get('/api/issues/:project/', async (req, res) => {
  const projectName = req.params.project;
  const _id = req.query._id?.toString();
  const issueTitle = req.query.issue_title?.toString();
  const issueText = req.query.issue_text?.toString();
  const createdBy = req.query.created_by?.toString();
  const assignedTo = req.query.assigned_to?.toString();
  const statusText = req.query.status_text?.toString();
  const open = getOpenStatus(req.query.open?.toString());
  let existingProject = await projects.findOne({ name: projectName });

  if (!existingProject) {
    console.log('Project ' + projectName + ' does not exists. Creating one...');
    const justCreatedProject = await projects.insertOne({ name: projectName });
    existingProject = await projects.findOne({ _id: new ObjectId(justCreatedProject.insertedId) });
  }
  let projectIssues = await issues.find({ project_id: existingProject._id }).toArray();

  if (_id) {
    projectIssues = projectIssues.filter(i => i._id.toString() === _id);
  }
  if (issueTitle) {
    projectIssues = projectIssues.filter(i => i.issue_title.toLowerCase().includes(issueTitle.toLowerCase()));
  }
  if (issueText) {
    projectIssues = projectIssues.filter(i => i.issue_text.toLowerCase().includes(issueText.toLowerCase()));
  }
  if (createdBy) {
    projectIssues = projectIssues.filter(i => i.created_by.toLowerCase().includes(createdBy.toLowerCase()));
  }
  if (assignedTo) {
    projectIssues = projectIssues.filter(i => i.assigned_to.toLowerCase().includes(assignedTo.toLowerCase()));
  }
  if (statusText) {
    projectIssues = projectIssues.filter(i => i.status_text.toLowerCase().includes(statusText.toLowerCase()));
  }
  if (open) {
    projectIssues = projectIssues.filter(i => i.open == getOpenStatus(open));
  }

  return res.json(projectIssues);

})

//Failed:You can send a PUT request to /api/issues/{projectname} with an _id and one or more fields to update. On success, the updated_on field should be updated, and returned should be {  result: 'successfully updated', '_id': _id }.
app.put('/api/issues/:project/', async (req, res) => {
  const { _id, issue_title, issue_text, created_by, assigned_to, status_text, open } = req.body;

  if (!_id) {
    return res.json({ error: 'missing id' })
  }
  if (!issue_title && !issue_text && !created_by && !assigned_to && !status_text && !open) {
    return res.json({ error: 'no update field(s) sent', '_id': _id })
  }

  const issueToUpdate = await issues.findOne({ _id: new ObjectId(_id) })

  //On any other error, the return value is { error: 'could not update', '_id': _id }
  if (!issueToUpdate) {
    return res.json({ error: 'could not update', '_id': _id })
  }
  if (issue_title) {
    await issues.findOneAndUpdate({ _id: issueToUpdate._id }, { "$set": { issue_title: issue_title, updated_on: new Date() } })
  }
  if (issue_text) {
    await issues.findOneAndUpdate({ _id: issueToUpdate._id }, { "$set": { issue_text: issue_text, updated_on: new Date() } })
  }
  if (created_by) {
    await issues.findOneAndUpdate({ _id: issueToUpdate._id }, { "$set": { created_by: created_by, updated_on: new Date() } })
  }
  if (assigned_to) {
    await issues.findOneAndUpdate({ _id: issueToUpdate._id }, { "$set": { assigned_to: assigned_to, updated_on: new Date() } })
  }
  if (status_text) {
    await issues.findOneAndUpdate({ _id: issueToUpdate._id }, { "$set": { status_text: status_text, updated_on: new Date() } })
  }
  if (open !== undefined) {
    await issues.findOneAndUpdate({ _id: issueToUpdate._id }, { "$set": { open: getOpenStatus(open), updated_on: new Date() } })
  }

  const updatedIssue = await issues.findOne({ _id: new ObjectId(_id) })

  return res.json({ result: 'successfully updated', '_id': _id });

})

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API 
apiRoutes(app);

//404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

//Start our server and tests!
const listener = app.listen(process.env.PORT || 3000, function() {
  console.log('Your app is listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function() {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 3500);
  }
});

module.exports = app; //for testing
