const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("MongoDB connected..!");
    
}).catch((err) => {
    console.log("MongoDB not connected..!", err);
});