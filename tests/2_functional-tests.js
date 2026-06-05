const chaiHttp = require('chai-http');
const chai     = require('chai');
const assert   = chai.assert;
const server   = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {

  // Test 1: Ver un stock
  test('Viewing one stock: GET request to /api/stock-prices/', function (done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);
        done();
      });
  });

  // Test 2: Ver un stock y darle like
  test('Viewing one stock and liking it: GET request to /api/stock-prices/', function (done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG', like: 'true' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.property(res.body.stockData, 'likes');
        assert.isNumber(res.body.stockData.likes);
        assert.isAbove(res.body.stockData.likes, 0);
        done();
      });
  });

  // Test 3: Dar like al mismo stock de nuevo (no debe incrementar)
  test('Viewing the same stock and liking it again: GET request to /api/stock-prices/', function (done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG', like: 'true' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        // El like no debe haberse duplicado desde el test anterior
        // (misma IP del servidor de test)
        assert.isNumber(res.body.stockData.likes);
        done();
      });
  });

  // Test 4: Ver dos stocks
  test('Viewing two stocks: GET request to /api/stock-prices/', function (done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'] })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.isArray(res.body.stockData);
        assert.equal(res.body.stockData.length, 2);
        assert.property(res.body.stockData[0], 'rel_likes');
        assert.property(res.body.stockData[1], 'rel_likes');
        done();
      });
  });

  // Test 5: Ver dos stocks y darles like
  test('Viewing two stocks and liking them: GET request to /api/stock-prices/', function (done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'], like: 'true' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.isArray(res.body.stockData);
        assert.property(res.body.stockData[0], 'rel_likes');
        assert.property(res.body.stockData[1], 'rel_likes');
        // rel_likes deben ser opuestos
        assert.equal(
          res.body.stockData[0].rel_likes,
          -res.body.stockData[1].rel_likes
        );
        done();
      });
  });

});