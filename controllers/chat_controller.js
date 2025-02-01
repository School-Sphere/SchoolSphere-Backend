const { ErrorHandler } = require("../middlewares/error");
const Message = require("../models/message_model");
const Room = require("../models/room_model");
const Joi = require("joi");
const User = require("../models/user_model");
const Class = require("../models/class_model");
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
            const currentUser = req.student || req.teacher;
            const schoolCode = currentUser.schoolCode;

            // Verify room exists and user has access
            const room = await Room.findOne({
                _id: roomId,
                schoolCode,
                'members.user': currentUser._id
            });

            if (!room) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this chat room'
                });
            }

            const query = { roomId };
            if (search) {
                query.content = { $regex: search, $options: 'i' };
            }

            const messages = await Message.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .populate('sender', 'name email profileImage');

            const total = await Message.countDocuments(query);

            // Add isSentByUser field to each message
            const messagesWithSentByUser = messages.map(message => {
                const messageObj = message.toObject();
                messageObj.isSentByUser = message.sender._id.toString() === currentUser._id.toString();
                return messageObj;
            });

            res.json({
                success: true,
                data: {
                    messages: messagesWithSentByUser,
                    total,
                    pages: Math.ceil(total / limit),
                    currentPage: parseInt(page)
                }
            });
        } catch (err) {
            console.error('Error getting messages:', err);
            next(err);
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

            if (user.role !== 'teacher') {
                return next(new ErrorHandler(403, "You are not authorized to create a room"));
            }

            const room = new Room({
                ...value,
                members: [{ user: req.user._id, role: user.role }],
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
            if (!room.isTeacher(user._id)) {
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
    },

    sendMessage: async (req, res, next) => {
        try {
            const { roomId } = req.params;
            const { content, type = 'TEXT' } = req.body;
            const sender = req.student || req.teacher;

            // Validate room exists
            const room = await Room.findById(roomId);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'Chat room not found'
                });
            }

            // Validate content
            if (!content || !content.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Message content cannot be empty'
                });
            }

            // Create new message with correct case for senderType
            const newMessage = new Message({
                roomId,
                sender: sender._id,
                senderType: req.student ? 'Student' : 'Teacher', // Matches enum case
                type: type.toUpperCase(),
                content: content.trim(),
                timestamp: new Date()
            });

            await newMessage.save();

            // Update room's lastMessage
            await Room.findByIdAndUpdate(roomId, {
                lastMessage: newMessage._id
            });

            // Populate sender details
            await newMessage.populate('sender', 'name email profileImage');

            res.status(201).json({
                success: true,
                message: 'Message sent successfully',
                data: {
                    messageId: newMessage._id,
                    content: newMessage.content,
                    type: newMessage.type,
                    sender: {
                        id: sender._id,
                        name: sender.name,
                        type: req.student ? 'Student' : 'Teacher'
                    },
                    timestamp: newMessage.timestamp,
                    roomId: roomId
                }
            });

        } catch (err) {
            console.error('Error sending message:', err);
            next(err);
        }
    },

    // 1. Get Teacher-Student chat rooms (for teachers)
    getTeacherStudentRooms: async (req, res, next) => {
        try {
            const teacherId = req.teacher._id;
            const { classId } = req.params;
            const schoolCode = req.teacher.schoolCode;

            // First, verify the teacher's association with the class
            const classData = await Class.findOne({
                _id: classId,
                schoolCode,
                $or: [
                    { classTeacher: teacherId },
                    { 'subjects.teacher': teacherId }
                ]
            }).populate('students', 'name email profileImage');

            if (!classData) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to view this class chat rooms'
                });
            }

            // Get all DM rooms for this class's students
            const rooms = await Room.find({
                type: 'DIRECT',
                schoolCode,
                'members.user': teacherId,
                members: {
                    $elemMatch: {
                        user: { $in: classData.students.map(s => s._id) }
                    }
                }
            }).populate([
                {
                    path: 'members.user',
                    select: 'name email profileImage'
                },
                {
                    path: 'lastMessage',
                    populate: {
                        path: 'sender',
                        select: 'name'
                    }
                }
            ]);

            // Format the response
            const formattedResponse = {
                classDetails: {
                    classId: classData._id,
                    className: classData.name,
                    section: classData.section
                },
                students: classData.students.map(student => {
                    const studentRoom = rooms.find(room =>
                        room.members.some(member =>
                            member.user._id.equals(student._id)
                        )
                    );

                    return {
                        studentId: student._id,
                        name: student.name,
                        email: student.email,
                        profileImage: student.profileImage,
                        chatRoom: studentRoom ? {
                            roomId: studentRoom._id,
                            lastMessage: studentRoom.lastMessage ? {
                                content: studentRoom.lastMessage.content,
                                timestamp: studentRoom.lastMessage.timestamp,
                                sender: studentRoom.lastMessage.sender.name
                            } : null
                        } : null
                    };
                })
            };

            res.json({
                success: true,
                message: 'Teacher-student chat rooms retrieved successfully',
                data: formattedResponse
            });

        } catch (err) {
            console.error('Error getting teacher-student rooms:', err);
            next(err);
        }
    },

    // 2. Get Class chat room
    getClassRoom: async (req, res, next) => {
        try {
            const { classId } = req.params;
            const user = req.student || req.teacher;
            const schoolCode = user.schoolCode;

            // Verify class exists and user belongs to it
            const classData = await Class.findOne({
                _id: classId,
                schoolCode,
                $or: [
                    { students: user._id },
                    { 'subjects.teacher': user._id }
                ]
            });

            if (!classData) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this class chat'
                });
            }

            // Find or create class group chat room
            let room = await Room.findOne({
                type: 'group',
                classId,
                schoolCode
            }).populate([
                {
                    path: 'members.user',
                    select: 'name email profileImage role',
                },
                {
                    path: 'lastMessage',
                    populate: {
                        path: 'sender',
                        select: 'name'
                    }
                }
            ]);

            if (!room) {
                // Create new class room if it doesn't exist
                room = await createClassRoom(classData, schoolCode);
            }

            res.json({
                success: true,
                message: 'Class chat room retrieved successfully',
                data: {
                    roomId: room._id,
                    name: `${classData.name}-${classData.section} Class Group`,
                    type: 'group',
                    members: room.members.map(member => ({
                        userId: member.user._id,
                        name: member.user.name,
                        email: member.user.email,
                        profileImage: member.user.profileImage,
                        role: member.role
                    })),
                    lastMessage: room.lastMessage ? {
                        content: room.lastMessage.content,
                        timestamp: room.lastMessage.timestamp,
                        sender: room.lastMessage.sender.name
                    } : null
                }
            });

        } catch (err) {
            console.error('Error getting class room:', err);
            next(err);
        }
    },

    // Initialize all chat rooms for a class (DMs and group chat)
    initializeClassChatRooms: async (req, res, next) => {
        try {
            const teacherId = req.teacher._id;
            const { classId } = req.params;
            const schoolCode = req.teacher.schoolCode;

            // Check if teacher is associated with the class
            const classData = await Class.findOne({
                _id: classId,
                schoolCode,
                $or: [
                    { classTeacher: teacherId },
                    { 'subjects.teacher': teacherId }
                ]
            }).populate('students', 'name email profileImage');

            if (!classData) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to create chat rooms for this class'
                });
            }

            const createdRooms = {
                directMessages: [],
                groupChat: null
            };

            // 1. Create DM rooms with each student
            for (const student of classData.students) {
                // Check if DM room already exists
                let dmRoom = await Room.findOne({
                    type: 'DIRECT',
                    schoolCode,
                    members: {
                        $all: [
                            { $elemMatch: { user: teacherId, userType: 'Teacher' } },
                            { $elemMatch: { user: student._id, userType: 'Student' } }
                        ]
                    }
                });

                if (!dmRoom) {
                    // Create new DM room
                    dmRoom = new Room({
                        type: 'DIRECT',
                        schoolCode,
                        members: [
                            { user: teacherId, userType: 'Teacher', role: 'ADMIN' },
                            { user: student._id, userType: 'Student', role: 'MEMBER' }
                        ],
                        createdBy: teacherId,
                        createdByType: 'Teacher'
                    });
                    await dmRoom.save();
                }

                createdRooms.directMessages.push({
                    roomId: dmRoom._id,
                    studentId: student._id,
                    studentName: student.name,
                    type: 'DIRECT'
                });
            }

            // 2. Create or get class group chat
            let groupRoom = await Room.findOne({
                type: 'GROUP',
                classId,
                schoolCode
            });

            if (!groupRoom) {
                // Create group chat room
                groupRoom = new Room({
                    name: `${classData.name}-${classData.section} Class Group`,
                    type: 'GROUP',
                    classId,
                    schoolCode,
                    members: [
                        {
                            user: teacherId,
                            userType: 'Teacher',
                            role: 'ADMIN'
                        },
                        ...classData.students.map(student => ({
                            user: student._id,
                            userType: 'Student',
                            role: 'MEMBER'
                        }))
                    ],
                    createdBy: teacherId,
                    createdByType: 'Teacher'
                });
                await groupRoom.save();
            }

            createdRooms.groupChat = {
                roomId: groupRoom._id,
                name: groupRoom.name,
                type: 'GROUP',
                memberCount: groupRoom.members.length
            };

            // Update class document with chat room references
            await Class.findByIdAndUpdate(classId, {
                groupChatRoom: groupRoom._id,
                $addToSet: {
                    chatRooms: {
                        $each: [...createdRooms.directMessages.map(dm => dm.roomId), groupRoom._id]
                    }
                }
            });

            res.status(201).json({
                success: true,
                message: 'Chat rooms initialized successfully',
                data: {
                    classId,
                    className: classData.name,
                    section: classData.section,
                    chatRooms: createdRooms
                }
            });

        } catch (err) {
            console.error('Error initializing class chat rooms:', err);
            next(err);
        }
    },

    getClassTeacherRoom: async (req, res, next) => {
        try {
            const studentId = req.student._id;
            const schoolCode = req.student.schoolCode;

            // Get student's class, class teacher and class group
            const studentClass = await Class.findOne({
                students: studentId,
                schoolCode
            }).populate({
                path: 'classTeacher',
                select: 'name email profileImage'
            });

            if (!studentClass) {
                return res.status(404).json({
                    success: false,
                    message: 'Student class not found'
                });
            }

            if (!studentClass.classTeacher) {
                return res.status(404).json({
                    success: false,
                    message: 'Class teacher not assigned'
                });
            }

            // Get both DM with class teacher and class group chat
            const rooms = await Room.find({
                schoolCode,
                $or: [
                    // DM with class teacher
                    {
                        type: 'DIRECT',
                        members: {
                            $all: [
                                { $elemMatch: { user: studentId, userType: 'Student' } },
                                { $elemMatch: { user: studentClass.classTeacher._id, userType: 'Teacher' } }
                            ]
                        }
                    },
                    // Class group chat
                    {
                        type: 'GROUP',
                        classId: studentClass._id
                    }
                ]
            }).populate([
                {
                    path: 'lastMessage',
                    populate: {
                        path: 'sender',
                        select: 'name'
                    }
                }
            ]);

            // Separate DM and group chat
            const teacherDM = rooms.find(room => room.type === 'DIRECT');
            const classGroup = rooms.find(room => room.type === 'GROUP');

            res.json({
                success: true,
                message: 'Chat rooms retrieved successfully',
                data: {
                    className: studentClass.name,
                    section: studentClass.section,
                    classTeacher: {
                        teacherId: studentClass.classTeacher._id,
                        name: studentClass.classTeacher.name,
                        email: studentClass.classTeacher.email,
                        profileImage: studentClass.classTeacher.profileImage,
                        chatRoom: teacherDM ? {
                            roomId: teacherDM._id,
                            type: 'DIRECT',
                            lastMessage: teacherDM.lastMessage ? {
                                content: teacherDM.lastMessage.content,
                                timestamp: teacherDM.lastMessage.timestamp,
                                sender: teacherDM.lastMessage.sender.name
                            } : null
                        } : null
                    },
                    classGroup: classGroup ? {
                        roomId: classGroup._id,
                        name: classGroup.name,
                        type: 'GROUP',
                        lastMessage: classGroup.lastMessage ? {
                            content: classGroup.lastMessage.content,
                            timestamp: classGroup.lastMessage.timestamp,
                            sender: classGroup.lastMessage.sender.name
                        } : null
                    } : null
                }
            });

        } catch (err) {
            console.error('Error getting chat rooms:', err);
            next(err);
        }
    }
};

// Utility function to create a class room
async function createClassRoom(classData, schoolCode) {
    const members = [
        // Add class teacher as admin
        {
            user: classData.classTeacher,
            userType: 'Teacher',
            role: 'admin'
        },
        // Add subject teachers as members
        ...classData.subjects.map(subject => ({
            user: subject.teacher,
            userType: 'Teacher',
            role: 'member'
        })),
        // Add students as members
        ...classData.students.map(studentId => ({
            user: studentId,
            userType: 'Student',
            role: 'member'
        }))
    ];

    const room = new Room({
        name: `${classData.name}-${classData.section} Class Group`,
        type: 'group',
        members,
        classId: classData._id,
        schoolCode,
        createdBy: classData.classTeacher,
        createdByType: 'Teacher'
    });

    await room.save();
    return room;
}

module.exports = chatCtrl;