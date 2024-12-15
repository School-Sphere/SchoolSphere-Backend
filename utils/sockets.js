const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Student = require("../models/student_model");
const Teacher = require("../models/teacher_model");
const Class = require("../models/class_model");

const JWT_SECRET = process.env.USER;

function initSocket(server) {
    const io = new Server(server);

    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided.'));
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await Student.findById(decoded.id) || await Teacher.findById(decoded.id);

            if (!user) {
                return next(new Error('Authentication error: User not found.'));
            }

            socket.user = user;
            socket.role = user instanceof Student ? "student" : "teacher";
            next();
        } catch (err) {
            return next(new Error('Authentication error: Invalid token.'));
        }
    });

    io.on("connection", (socket) => {
        const { role, _id, username } = socket.user;

        if (role === "student") {
            socket.join(`class:${socket.user.classId}`);
        } else if (role === "teacher") {
            socket.user.classes.forEach(classId => socket.join(`class:${classId}`));
        }

        socket.on("group_message", async ({ classId, message }) => {
            if (role === "student" && socket.user.classId.toString() !== classId) {
                return socket.emit("error", "Unauthorized: You can't send messages to this class.");
            }
            io.to(`class:${classId}`).emit("group_message", { sender: username, message });
        });

        socket.on("private_message", async ({ recipientId, message }) => {
            if (role === "student") {
                const recipient = await Teacher.findById(recipientId);
                if (!recipient) return socket.emit("error", "Recipient not found or unauthorized.");
            }

            const recipientSocket = [...io.sockets.sockets.values()].find(s => s.user._id.toString() === recipientId);
            if (recipientSocket) {
                recipientSocket.emit("private_message", { sender: username, message });
            } else {
                socket.emit("error", "Recipient is not online.");
            }
        });

        socket.on("add_to_class", async ({ classId, userId, role }) => {
            if (role !== "teacher") {
                return socket.emit("error", "Unauthorized: Only teachers can add users.");
            }

            const classData = await Class.findById(classId);
            if (!classData.teachers.includes(socket.user._id)) {
                return socket.emit("error", "Unauthorized: You don't manage this class.");
            }

            if (role === "student") {
                await Class.findByIdAndUpdate(classId, { $addToSet: { students: userId } });
            } else if (role === "teacher") {
                await Class.findByIdAndUpdate(classId, { $addToSet: { teachers: userId } });
            }

            io.to(`class:${classId}`).emit("class_update", `${userId} has been added to the class.`);
        });

        socket.on("disconnect", () => {
            console.log(`${username} disconnected.`);
        });
    });
}

module.exports = { initSocket };
