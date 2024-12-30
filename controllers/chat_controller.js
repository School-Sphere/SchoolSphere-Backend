const { ErrorHandler } = require("../middlewares/error");
const Message = require("../models/message_model");
const Room = require("../models/room_model");
const Joi = require("joi");
const User = require("../models/user_model");
// Validation schemas
const roomSchema = Joi.object({
    name: Joi.string().required().min(3).max(50),
    description: Joi.string().max(200),
    type: Joi.string().valid('private', 'group').required()
});

const messageSchema = Joi.object({
    content: Joi.string().required().max(1000),
    roomId: Joi.string().required()
});

const chatCtrl = {
    // Message history retrieval with pagination
    getMessages: async (req, res, next) => {
        try {
            const { roomId } = req.params;
            const { page = 1, limit = 50, search } = req.query;
            
            const query = { roomId };
            if (search) {
                query.content = { $regex: search, $options: 'i' };
            }

            const messages = await Message.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .populate('sender', 'name email');

            const total = await Message.countDocuments(query);

            res.json({
                success: true,
                data: {
                    messages,
                    total,
                    pages: Math.ceil(total / limit),
                    currentPage: page
                }
            });
        } catch (e) {
            next(e);
        }
    },

    // Room management
    createRoom: async (req, res, next) => {
        try {
            const { error, value } = roomSchema.validate(req.body);
            if (error) {
                return next(new ErrorHandler(400, error.details[0].message));
            }

            const user = await User.findById(req.user._id);
            if (!user) {
                return next(new ErrorHandler(404, "User not found"));
            }

            if(user.role !== 'teacher'){
                return next(new ErrorHandler(403, "You are not authorized to create a room"));
            }

            const room = new Room({
                ...value,
                members: [{user: req.user._id, role: user.role}],
                schoolCode: user.schoolCode
            });

            await room.save();
            res.status(201).json({
                success: true,
                message: "Room created successfully",
                data: room
            });
        } catch (e) {
            next(e);
        }
    },

    updateRoom: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { error, value } = roomSchema.validate(req.body);
            if (error) {
                return next(new ErrorHandler(400, error.details[0].message));
            }

            const room = await Room.findOneAndUpdate(
                { _id: id, creator: req.user._id },
                value,
                { new: true }
            );

            if (!room) {
                return next(new ErrorHandler(404, "Room not found or unauthorized"));
            }

            res.json({
                success: true,
                message: "Room updated successfully",
                data: room
            });
        } catch (e) {
            next(e);
        }
    },

    deleteRoom: async (req, res, next) => {
        try {
            const { id } = req.params;
            const user = await User.findById(req.user._id);
            if (!user) {
                return next(new ErrorHandler(404, "User not found"));
            }
            if(!room.isTeacher(user._id)){
                return next(new ErrorHandler(403, "You are not authorized to delete a room"));
            }
            const room = await Room.findOneAndDelete({ 
                _id: id, 
            });

            if (!room) {
                return next(new ErrorHandler(404, "Room not found or unauthorized"));
            }

            // Delete all messages in the room
            await Message.deleteMany({ roomId: id });

            res.json({
                success: true,
                message: "Room deleted successfully"
            });
        } catch (e) {
            next(e);
        }
    },

    // Member management
    addMember: async (req, res, next) => {
        try {
            const { roomId, userId } = req.body;
            const room = await Room.findById(roomId);

            if (!room) {
                return next(new ErrorHandler(404, "Room not found"));
            }

            if (!room.members.includes(req.user._id)) {
                return next(new ErrorHandler(403, "Not authorized to add members"));
            }

            if (room.members.includes(userId)) {
                return next(new ErrorHandler(400, "User is already a member"));
            }
            const user = await User.findById(userId);
            if (!user) {
                return next(new ErrorHandler(404, "User not found"));
            }

            await room.addMember(userId, user.role);

            res.json({
                success: true,
                message: "Member added successfully",
                data: room
            });
        } catch (e) {
            next(e);
        }
    },

    removeMember: async (req, res, next) => {
        try {
            const { roomId, userId } = req.params;
            const room = await Room.findById(roomId);

            if (!room) {
                return next(new ErrorHandler(404, "Room not found"));
            }

            if (room.creator.toString() !== req.user._id.toString()) {
                return next(new ErrorHandler(403, "Not authorized to remove members"));
            }

            if (!room.members.includes(userId)) {
                return next(new ErrorHandler(400, "User is not a member"));
            }

            const user = await User.findById(userId);
            if (!user) {
                return next(new ErrorHandler(404, "User not found"));
            }

            await room.removeMember(userId);

            res.json({
                success: true,
                message: "Member removed successfully",
                data: room
            });
        } catch (e) {
            next(e);
        }
    },

    // Message search
    searchMessages: async (req, res, next) => {
        try {
            const { roomId } = req.params;
            const { query, from, to } = req.query;
            
            const searchQuery = {
                roomId,
                content: { $regex: query, $options: 'i' }
            };

            if (from || to) {
                searchQuery.createdAt = {};
                if (from) searchQuery.createdAt.$gte = new Date(from);
                if (to) searchQuery.createdAt.$lte = new Date(to);
            }

            const messages = await Message.find(searchQuery)
                .sort({ createdAt: -1 })
                .populate('sender', 'name email');

            res.json({
                success: true,
                data: messages
            });
        } catch (e) {
            next(e);
        }
    }
};

module.exports = chatCtrl;