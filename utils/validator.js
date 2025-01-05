const Joi = require("joi");
const passwordSchema = Joi.object({
  password: Joi.string().regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!#%*?&])[A-Za-z\d@#$!%*?&]{8,}$/
  ),
});

module.exports = {
  passwordSchema
};