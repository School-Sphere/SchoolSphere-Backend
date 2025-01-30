const express = require("express");
const rateLimit = require("express-rate-limit");
const chatCtrl = require("../controllers/chat_controller");
const { studentAuth } = require("../middlewares/student");
const teacherAuth = require("../middlewares/teacher");
const chatRouter = express.Router();

// Rate limiter for message endpoints
const messageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: "Too many messages sent. Please try again later."
});

// Message sending endpoint
chatRouter.post("/messages/:roomId",
    studentAuth || teacherAuth,
    messageLimiter,  // Apply rate limiting
    chatCtrl.sendMessage
);

// Message history routes
chatRouter.get("/messages/:roomId",
    studentAuth || teacherAuth,
    chatCtrl.getMessages
);

chatRouter.get("/messages/search/:roomId",
    studentAuth || teacherAuth,
    chatCtrl.searchMessages
);

// Room management routes
chatRouter.post("/rooms",
    studentAuth || teacherAuth,
    chatCtrl.createRoom
);

chatRouter.put("/rooms/:id",
    studentAuth || teacherAuth,
    chatCtrl.updateRoom
);

chatRouter.delete("/rooms/:id",
    studentAuth || teacherAuth,
    chatCtrl.deleteRoom
);

// Member management routes
chatRouter.post("/rooms/members",
    studentAuth || teacherAuth,
    chatCtrl.addMember
);

chatRouter.delete("/rooms/:roomId/members/:userId",
    studentAuth || teacherAuth,
    chatCtrl.removeMember
);

// Chat room listing endpoints
chatRouter.get("/rooms/teacher-to-student/:classId", teacherAuth, chatCtrl.getTeacherStudentRooms);
chatRouter.get("/rooms/class/:classId", studentAuth || teacherAuth, chatCtrl.getClassRoom);
// chatRouter.get("/chat/rooms/student-teacher", studentAuth, chatCtrl.getStudentTeacherRooms);

// Create chat rooms for a class (both DMs and group chat)
chatRouter.post("/rooms/initialize/:classId", teacherAuth, chatCtrl.initializeClassChatRooms);

module.exports = chatRouter;