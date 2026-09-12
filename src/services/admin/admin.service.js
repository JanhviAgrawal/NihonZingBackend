const Admin = require('../../model/admin.model');

const SAFE_FIELDS = '_id first_name last_name email phone role profile_image isActive created_at updated_at';

module.exports = class AdminAuthServices {
    
    async registerAdmin(body) {
        try {
            return await Admin.create(body);
        } catch (error) {
            console.log("Admin Registration Error: ", error);
            throw error;
        }
    }

    
    async fetchSingleAdmin(body, isSelect) {
        try {
            if (isSelect) {
                return await Admin.findOne(body).select(SAFE_FIELDS);
            } else {
                return await Admin.findOne(body);
            }
        } catch (error) {
            console.log("Fetch Single Admin Error: ", error);
            throw error;
        }
    }

    async fetchAllAdmin() {
        try {
            return await Admin.find({ isDelete: false }).select(SAFE_FIELDS);
        } catch (error) {
            console.log("Fetch All Admin Error: ", error);
            throw error;
        }
    }
    
    async updateAdmin(id, body) {
        try {
            return await Admin.findByIdAndUpdate(id, body, { new: true }).select(SAFE_FIELDS);
        } catch (error) {
            console.log("Update Admin Error: ", error);
            throw error;
        }
    }
}