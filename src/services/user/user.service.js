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

    // ADDED: hard-delete method, used by registerUser's rollback when OTP mail fails
    async deleteUser(id) {
        try {
            return await User.findByIdAndDelete(id);
        } catch (error) {
            console.log("Delete User Error: ", error);
            throw error;
        }
    }
    async fetchLeaderboard(limit = 20) {
        try {
            const users = await User.find({ isDelete: false, isActive: true })
                .sort({ xp: -1 })
                .limit(limit)
                .select('_id first_name last_name address xp');

            return users.map(u => ({
                id: u._id,
                name: `${u.first_name} ${u.last_name}`,
                xp: u.xp,
                avatar: u.address || ''
            }));
        } catch (error) {
            console.log("Fetch Leaderboard Error: ", error);
            throw error;
        }
    }

    async incrementXP(id, amount) {
        try {
            return await User.findByIdAndUpdate(id, { $inc: { xp: amount } }, { new: true })
                .select('_id first_name last_name address xp');
        } catch (error) {
            console.log("Increment XP Error: ", error);
            throw error;
        }
    }
}