const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  this.timeout(15000);
  test('Create an issue with every field: POST request to /api/issues/apitest', function(done) {
    chai
      .request(server)
      .keepOpen()
      .post('/api/issues/apitest')
      .send({
        "issue_title": "Colombo",
        "issue_text": "Check if colombo issue is there",
        "created_by": "Test Suite",
        "assigned_to": "Chai test",
        "status_text": "Open",
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.type, 'application/json');
        assert.equal(res.body.issue_title, 'Colombo');
        assert.equal(res.body.issue_text, 'Check if colombo issue is there');
        assert.equal(res.body.created_by, 'Test Suite');
        assert.equal(res.body.assigned_to, 'Chai test');
        assert.equal(res.body.status_text, 'Open');
        done();
      });
  });

  test('Create an issue with only required fields: POST request to /api/issues/apitest', function(done) {
    chai
      .request(server)
      .keepOpen()
      .post('/api/issues/apitest')
      .send({
        "issue_title": "Colombo",
        "issue_text": "Check if colombo issue is there",
        "created_by": "Test Suite",
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.type, 'application/json');
        assert.equal(res.body.issue_title, 'Colombo');
        assert.equal(res.body.issue_text, 'Check if colombo issue is there');
        assert.equal(res.body.created_by, 'Test Suite');
        done();
      });
  });

  test('Create an issue with missing required fields: POST request to /api/issues/apitest', function(done) {
    chai
      .request(server)
      .keepOpen()
      .post('/api/issues/apitest')
      .send({
        "assigned_to": "Chai test",
        "status_text": "Waiting for resources",
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, '{"error":"required field(s) missing"}');
        done();
      });
  });

  test('View issues on a project: GET request to /api/issues/apitest', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/issues/apitest')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body, 'Response should be an array');

        res.body.forEach(issue => {
          assert.isObject(issue, 'Each item in the array should be an object');
          assert.property(issue, '_id', 'required property for each issue');
          assert.property(issue, 'project_id', 'required property for each issue');
          assert.property(issue, 'issue_title', 'required property for each issue');
          assert.property(issue, 'issue_text', 'required property for each issue');
          assert.property(issue, 'open', 'required property for each issue');
          assert.property(issue, 'created_on', 'required property for each issue');
          assert.property(issue, 'updated_on', 'required property for each issue');
        });
        done();
      });
  });

  test('View issues on a project with one filter: GET request to /api/issues/{project}', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/issues/apitest?open=true')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body, 'Response should be an array');

        res.body.forEach(issue => {
          assert.isObject(issue, 'Each item in the array should be an object');
          assert.isTrue(issue.open);
        });
        done();
      });
  });

  test('View issues on a project with multiple filters: GET request to /api/issues/{project}', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/issues/apitest?open=true&issue_text=check')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body, 'Response should be an array');

        res.body.forEach(issue => {
          assert.isObject(issue, 'Each item in the array should be an object');
          assert.isTrue(issue.open);
          assert.isTrue(issue.issue_text.toLowerCase().includes('check'));
        });
        done();
      });
  });

  test('Update one field on an issue: PUT request to /api/issues/{project}', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/issues/apitest')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body, 'Response should be an array');

        const lastElement = res.body[res.body.length - 1];

        chai
          .request(server)
          .put('/api/issues/apitest')
          .send({
            "_id": lastElement._id,
            "assigned_to": "Update test",
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, `{"result":"successfully updated","_id":"${lastElement._id}"}`);

            chai
              .request(server)
              .get(`/api/issues/apitest?_id=${lastElement._id}`)
              .end((err, res) => {
                assert.equal(res.status, 200);
                assert.equal(res.body[0].assigned_to, 'Update test')

                done();
              })
          });
      });
  });

  test('Update multiple fields on an issue: PUT request to /api/issues/{project}', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/issues/apitest')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body, 'Response should be an array');

        const lastElement = res.body[res.body.length - 1];

        chai
          .request(server)
          .put('/api/issues/apitest')
          .send({
            "_id": lastElement._id,
            "assigned_to": "Update test",
            "open": false
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, `{"result":"successfully updated","_id":"${lastElement._id}"}`);

            chai
              .request(server)
              .get(`/api/issues/apitest?_id=${lastElement._id}`)
              .end((err, res) => {
                assert.equal(res.status, 200);
                assert.equal(res.body[0].assigned_to, 'Update test')
                assert.isFalse(res.body[0].open)

                done();
              })
          });
      });
  });

  test('Update an issue with missing _id: PUT request to /api/issues/{project}', function(done) {
    chai
      .request(server)
      .keepOpen()
      .put('/api/issues/apitest')
      .send({
        "assigned_to": "Update with no id",
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, '{"error":"missing _id"}');
      });
    done();
  });

  test('Update an issue with no fields to update: PUT request to /api/issues/{project}', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/issues/apitest')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body, 'Response should be an array');

        const lastElement = res.body[res.body.length - 1];

        chai
          .request(server)
          .put('/api/issues/apitest')
          .send({
            "_id": lastElement._id,
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, `{"error":"no update field(s) sent","_id":"${lastElement._id}"}`);
            done();
          });
      });
  });

  test('Update an issue with an invalid _id: PUT request to /api/issues/{project}', function(done) {
    const invalidId = "000000000000000000000000"
    chai
      .request(server)
      .keepOpen()
      .put('/api/issues/apitest')
      .send({
        "_id": invalidId,
        "assigned_to": "Update with no id",
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, `{"error":"could not update","_id":"${invalidId}"}`);
      });
    done();
  });

  test('Delete an issue: DELETE request to /api/issues/{project}', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/issues/apitest')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body, 'Response should be an array');

        const lastElement = res.body[res.body.length - 1];
        
        chai
          .request(server)
          .delete('/api/issues/apitest')
          .send({
            "_id": lastElement._id
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, `{"result":"successfully deleted","_id":"${lastElement._id}"}`);

            chai
              .request(server)
              .get(`/api/issues/apitest?_id=${lastElement._id}`)
              .end((err, res) => {
                assert.equal(res.status, 200);
                assert.equal(res.body.length, 0)
                done();
              })
          });
      });
  });

  test('Delete an issue with an invalid _id: DELETE request to /api/issues/{project}', function(done) {
    chai
      .request(server)
      .keepOpen()
      .delete('/api/issues/apitest')
      .send({})
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, '{"error":"missing _id"}');
      });
    done();
  });

  test('Delete an issue with missing _id: DELETE request to /api/issues/{project}', function(done) {
    const invalidId = "000000000000000000000000"
    chai
      .request(server)
      .keepOpen()
      .delete('/api/issues/apitest')
      .send({
        "_id": invalidId
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, `{"error":"could not delete","_id":"${invalidId}"}`);
      });
    done();
  });

});
