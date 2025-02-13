const express = require("express");
const rateLimit = require("express-rate-limit");
const chatCtrl = require("../controllers/chat_controller");
const studentAuth = require("../middlewares/student");
const teacherAuth = require("../middlewares/teacher");
const validateAuth = require("../middlewares/auth");
const chatRouter = express.Router();

// Rate limiter for message endpoints
const messageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: "Too many messages sent. Please try again later."
});

// Message sending endpoint
chatRouter.post("/messages/:roomId",
    validateAuth,
    messageLimiter,  // Apply rate limiting
    chatCtrl.sendMessage
);

// Message history routes
chatRouter.get("/messages/:roomId",
    validateAuth,
    chatCtrl.getMessages
);

chatRouter.get("/messages/search/:roomId",
    validateAuth,
    chatCtrl.searchMessages
);

// Room management routes
chatRouter.post("/rooms",
    validateAuth,
    chatCtrl.createRoom
);

chatRouter.put("/rooms/:id",
    validateAuth,
    chatCtrl.updateRoom
);

chatRouter.delete("/rooms/:id",
    validateAuth,
    chatCtrl.deleteRoom
);

// Member management routes
chatRouter.post("/rooms/members",
    validateAuth,
    chatCtrl.addMember
);

chatRouter.delete("/rooms/:roomId/members/:userId",
    validateAuth,
    chatCtrl.removeMember
);
chatRouter.get("/rooms/teacher-to-student/:classId", teacherAuth, chatCtrl.getTeacherStudentRooms);
chatRouter.get("/rooms/student-to-classTeacher", studentAuth, chatCtrl.getClassTeacherRoom);
chatRouter.post("/rooms/initialize/:classId", teacherAuth, chatCtrl.initializeClassChatRooms);

module.exports = chatRouter;