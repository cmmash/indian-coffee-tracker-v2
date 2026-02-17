const express = require('express');
const cors = require('cors');
const path = require('path');
const { Coffee, PriceHistory, initializeDatabase } = require('./db');
const { Op } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/coffees', async (req, res, next) => {
  try {
    const { roaster, roastLevel, search, inStock } = req.query;
    
    const where = {};
    
    if (roaster) {
      where.roaster = roaster;
    }
    
    if (roastLevel) {
      where.roastLevel = roastLevel;
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { roaster: { [Op.iLike]: `%${search}%` } },
        { origin: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (inStock !== undefined) {
      where.inStock = inStock === 'true';
    }
    
    const coffees = await Coffee.findAll({
      where,
      order: [['name', 'ASC']],
      attributes: {
        exclude: ['createdAt', 'updatedAt']
      }
    });
    
    res.json(coffees);
  } catch (error) {
    next(error);
  }
});

app.get('/api/coffees/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const coffee = await Coffee.findByPk(id, {
      include: [{
        model: PriceHistory,
        as: 'priceHistory',
        attributes: ['id', 'price', 'effectiveDate'],
        order: [['effectiveDate', 'ASC']]
      }],
      attributes: {
        exclude: ['createdAt', 'updatedAt']
      }
    });
    
    if (!coffee) {
      return res.status(404).json({ error: 'Coffee not found' });
    }
    
    res.json(coffee);
  } catch (error) {
    next(error);
  }
});

app.post('/api/coffees', async (req, res, next) => {
  try {
    const coffeeData = req.body;
    
    const coffee = await Coffee.create(coffeeData);
    
    await PriceHistory.create({
      coffeeId: coffee.id,
      price: coffee.currentPrice,
      effectiveDate: new Date()
    });
    
    const coffeeWithHistory = await Coffee.findByPk(coffee.id, {
      include: [{
        model: PriceHistory,
        as: 'priceHistory'
      }]
    });
    
    res.status(201).json(coffeeWithHistory);
  } catch (error) {
    next(error);
  }
});

app.put('/api/coffees/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const coffee = await Coffee.findByPk(id);
    
    if (!coffee) {
      return res.status(404).json({ error: 'Coffee not found' });
    }
    
    const oldPrice = parseFloat(coffee.currentPrice);
    const newPrice = parseFloat(updateData.currentPrice);
    
    await coffee.update(updateData);
    
    if (newPrice && newPrice !== oldPrice) {
      await PriceHistory.create({
        coffeeId: coffee.id,
        price: newPrice,
        effectiveDate: new Date()
      });
    }
    
    const updatedCoffee = await Coffee.findByPk(id, {
      include: [{
        model: PriceHistory,
        as: 'priceHistory'
      }]
    });
    
    res.json(updatedCoffee);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/coffees/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const coffee = await Coffee.findByPk(id);
    
    if (!coffee) {
      return res.status(404).json({ error: 'Coffee not found' });
    }
    
    await coffee.destroy();
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/roasters', async (req, res, next) => {
  try {
    const roasters = await Coffee.findAll({
      attributes: [[Coffee.sequelize.fn('DISTINCT', Coffee.sequelize.col('roaster')), 'roaster']],
      order: [['roaster', 'ASC']],
      raw: true
    });
    
    res.json(roasters.map(r => r.roaster));
  } catch (error) {
    next(error);
  }
});

app.get('/api/roast-levels', async (req, res, next) => {
  try {
    const roastLevels = await Coffee.findAll({
      attributes: [[Coffee.sequelize.fn('DISTINCT', Coffee.sequelize.col('roastLevel')), 'roastLevel']],
      order: [['roastLevel', 'ASC']],
      raw: true
    });
    
    res.json(roastLevels.map(r => r.roastLevel));
  } catch (error) {
    next(error);
  }
});

app.get('/api/price-history/:coffeeId', async (req, res, next) => {
  try {
    const { coffeeId } = req.params;
    
    const priceHistory = await PriceHistory.findAll({
      where: { coffeeId },
      order: [['effectiveDate', 'DESC']],
      attributes: ['id', 'price', 'effectiveDate']
    });
    
    res.json(priceHistory);
  } catch (error) {
    next(error);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;