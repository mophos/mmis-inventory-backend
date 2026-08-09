import * as crypto from 'crypto';

const bcrypt = require('bcryptjs');

/**
 * เทียบรหัสผ่านในช่วงเปลี่ยนผ่านจาก MD5 -> bcrypt
 *
 * ใช้กับจุดที่ให้ผู้ใช้ "กรอกรหัสผ่านซ้ำเพื่อยืนยันการทำรายการ" (อนุมัติเบิกจ่าย,
 * ปรับสต็อก, โอนย้าย ฯลฯ) ซึ่งเดิมเทียบ md5 ใน SQL ตรงๆ วิธีนั้นใช้กับ bcrypt ไม่ได้
 * เพราะ bcrypt hash ค่าเดียวกันได้ผลต่างกันทุกครั้ง (มี salt) ต้องดึงแถวมาเทียบใน node
 *
 * ต่างจาก mmis-management-backend ตรงที่ไม่ได้ดูคอลัมน์ password_algo
 * แต่ดูจาก "รูปแบบของ hash" แทน:
 *
 *   bcrypt : ขึ้นต้นด้วย $2a$ / $2b$ / $2y$ ยาว 60 ตัว
 *   md5    : hex 32 ตัว ไม่มีวันขึ้นต้นด้วย $
 *
 * ทำแบบนี้เพราะ repo นี้ไม่จำเป็นต้องรู้ว่าฐานข้อมูลรัน SQL migration แล้วหรือยัง
 * ถ้าไปอ่านคอลัมน์ password_algo จะต้องตรวจ information_schema ก่อนทุกครั้ง
 * ไม่งั้น query จะพังในโรงพยาบาลที่ยังไม่ได้รัน migration
 */
export class PasswordModel {

  md5(password: string): string {
    return crypto.createHash('md5').update(password).digest('hex');
  }

  /** รหัสผ่านที่เก็บไว้เป็น bcrypt หรือไม่ (ดูจากรูปแบบ ไม่ต้องพึ่งคอลัมน์ password_algo) */
  isBcrypt(storedPassword: string): boolean {
    return /^\$2[aby]?\$/.test(storedPassword || '');
  }

  verify(plainPassword: string, storedPassword: string): boolean {
    if (!plainPassword || !storedPassword) {
      return false;
    }

    if (this.isBcrypt(storedPassword)) {
      try {
        return bcrypt.compareSync(plainPassword, storedPassword);
      } catch (error) {
        return false;
      }
    }

    return this.md5(plainPassword) === storedPassword;
  }

}
