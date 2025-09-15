import 'dotenv/config';
import * as Joi from 'joi';

console.log(process.env);

export default () => {
  const schema = Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'test', 'production')
      .required(),
    PORT: Joi.number().default(3000),
    GLOBAL_PREFIX: Joi.string().default('api'),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().required(),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    REDIS_PORT: Joi.number().default(6379),
  }).unknown(true);

  const { error, value } = schema.validate(process.env, { abortEarly: false });
  if (error) throw new Error(`Config validation error: ${error.message}`);
  return value;
};
