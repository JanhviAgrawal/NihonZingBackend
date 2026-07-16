const User = require('../../model/user.model');

module.exports = class UserAuthService {
    
    async registerUser(body) {
        try {
            return await User.create(body);
        } catch (error) {
            console.log("User Register Error : ", error);
            throw error;
        }
    }

    async fetchSingleUser(body, isSelect) {
        try {
            if (isSelect) {
                return await User.findOne(body).select('_id first_name last_name email phone address isActive created_at updated_at');
            } else {
                return await User.findOne(body);
            }
        } catch (error) {
            console.log("Fetch Single User Error: ", error);
            throw error;
        }
    }

    async fetchAllUser() {
        try {
            return await User.find({ isDelete: false }).select('_id first_name last_name email phone gender address isActive created_at updated_at');
        } catch (error) {
            console.log("Fetch All User Error: ", error);
            throw error;
        }
    }

    async updateUser(id, body) {
        try {
            return await User.findByIdAndUpdate(id, body, { new: true }).select('_id first_name last_name email phone gender address isActive created_at updated_at');
        } catch (error) {
            console.log("Update User Error: ", error);
            throw error;
        }
    }
}