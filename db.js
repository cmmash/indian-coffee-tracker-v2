const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost:5432/coffee_db', {
  dialect: 'postgres',
  logging: false,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

const Coffee = sequelize.define('Coffee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  roaster: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  roastLevel: {
    type: DataTypes.ENUM('light', 'medium', 'medium-dark', 'dark'),
    allowNull: false
  },
  origin: {
    type: DataTypes.STRING,
    allowNull: true
  },
  currentPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  weight: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 340,
    comment: 'Weight in grams'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tastingNotes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  inStock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['roaster']
    },
    {
      fields: ['roastLevel']
    },
    {
      fields: ['name']
    }
  ]
});

const PriceHistory = sequelize.define('PriceHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  coffeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Coffee,
      key: 'id'
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  effectiveDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['coffeeId']
    },
    {
      fields: ['effectiveDate']
    }
  ]
});

Coffee.hasMany(PriceHistory, {
  foreignKey: 'coffeeId',
  as: 'priceHistory',
  onDelete: 'CASCADE'
});

PriceHistory.belongsTo(Coffee, {
  foreignKey: 'coffeeId',
  as: 'coffee'
});

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    await sequelize.sync({ alter: false });
    console.log('Database models synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Coffee,
  PriceHistory,
  initializeDatabase
};