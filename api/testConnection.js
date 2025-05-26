import mongoose from 'mongoose';

const testConnection = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect("mongodb+srv://pramodhkumar782006:pramodh786@cluster0.a0woy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    });
    console.log('Successfully connected to MongoDB!');
    
    // Test database operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed successfully');
  } catch (error) {
    console.error('Connection test failed:', {
      name: error.name,
      message: error.message,
      code: error.code,
      codeName: error.codeName
    });
  }
};

testConnection(); 