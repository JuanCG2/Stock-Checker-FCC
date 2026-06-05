'use strict';

const mongoose = require('mongoose');
const crypto   = require('crypto');

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI);

// Schema: guarda símbolo y lista de IPs hasheadas que dieron like
const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true, uppercase: true },
  likes:  [{ type: String }], // IPs anonimizadas (hash)
});
const Stock = mongoose.model('Stock', stockSchema);

// Anonimiza la IP con SHA-256 (cumple GDPR)
function hashIp(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// Obtiene precio desde el proxy de freeCodeCamp
async function getStockPrice(symbol) {
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Stock not found');
  const data = await response.json();
  return data.latestPrice;
}

// Busca o crea el documento del stock en DB
async function findOrCreateStock(symbol) {
  let stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
  if (!stock) {
    stock = new Stock({ symbol: symbol.toUpperCase(), likes: [] });
    await stock.save();
  }
  return stock;
}

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        const { stock, like } = req.query;
        const shouldLike = like === 'true';

        // IP del cliente, anonimizada
        const rawIp  = req.ip || req.connection.remoteAddress;
        const hashedIp = hashIp(rawIp);

        // ── Caso 1: un solo stock ──────────────────────────────────────
        if (!Array.isArray(stock)) {
          const symbol = stock.toUpperCase();
          const price  = await getStockPrice(symbol);
          const doc    = await findOrCreateStock(symbol);

          // Solo agrega like si no lo ha dado antes
          if (shouldLike && !doc.likes.includes(hashedIp)) {
            doc.likes.push(hashedIp);
            await doc.save();
          }

          return res.json({
            stockData: {
              stock:  symbol,
              price:  price,
              likes:  doc.likes.length,
            },
          });
        }

        // ── Caso 2: dos stocks ─────────────────────────────────────────
        const [symbol1, symbol2] = stock.map(s => s.toUpperCase());

        const [price1, price2, doc1, doc2] = await Promise.all([
          getStockPrice(symbol1),
          getStockPrice(symbol2),
          findOrCreateStock(symbol1),
          findOrCreateStock(symbol2),
        ]);

        if (shouldLike) {
          if (!doc1.likes.includes(hashedIp)) {
            doc1.likes.push(hashedIp);
            await doc1.save();
          }
          if (!doc2.likes.includes(hashedIp)) {
            doc2.likes.push(hashedIp);
            await doc2.save();
          }
        }

        const rel1 = doc1.likes.length - doc2.likes.length;
        const rel2 = doc2.likes.length - doc1.likes.length;

        return res.json({
          stockData: [
            { stock: symbol1, price: price1, rel_likes: rel1 },
            { stock: symbol2, price: price2, rel_likes: rel2 },
          ],
        });

      } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    });
};
