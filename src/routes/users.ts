'use strict';

import * as express from 'express';

const router = express.Router();

/**
 * POST /users/change-password — ปิดการใช้งานแล้ว
 *
 * เดิม endpoint นี้ hash รหัสผ่านเป็น md5 ดิบแล้วเขียนทับคอลัมน์ password โดยตรง
 * โดยไม่แตะ password_algo ซึ่งใช้ไม่ได้อีกแล้วหลังระบบย้ายไปใช้ bcrypt:
 * ผู้ใช้ที่เปลี่ยนรหัสผ่านไปแล้ว (password_algo = 'bcrypt') ถ้ามาเปลี่ยนรหัสจากที่นี่
 * รหัสจะกลายเป็น md5 แต่ระบบยังเทียบด้วย bcrypt -> เจ้าของบัญชีเข้าระบบไม่ได้อีกเลย
 *
 * การเปลี่ยนรหัสผ่านทั้งหมดต้องทำผ่านหน้าเข้าสู่ระบบ (mmis-management-backend)
 * ซึ่งจัดการ bcrypt, password_algo, ประวัติ และการบังคับเปลี่ยนรหัสให้ครบถ้วน
 *
 * ไม่ลบ route ทิ้งเพื่อให้หน้าจอรุ่นเก่าที่ยังเรียกอยู่ได้ข้อความที่อ่านรู้เรื่อง
 * แทนที่จะได้ 404 ที่ไม่บอกอะไรผู้ใช้เลย
 */
router.post('/change-password', (req, res, next) => {
  res.send({
    ok: false,
    error: 'กรุณาเปลี่ยนรหัสผ่านที่หน้าเข้าสู่ระบบของ MMIS'
  });
});

export default router;
