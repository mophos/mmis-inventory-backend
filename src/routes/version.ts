import * as express from 'express';
import * as wrap from 'co-express';

const router = express.Router();

router.get('/', (req, res, next) => {
  res.send({ ok: true, version: 'v2.0.0', build: '20170917' });
});

export default router;

