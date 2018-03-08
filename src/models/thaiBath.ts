export class ThaiBath {
  toThaiBath(numberBath: any) {
    //ตัดสิ่งที่ไม่ต้องการทิ้งลงโถส้วม
    for (var i = 0; i < numberBath.length; i++) {
      numberBath = numberBath.replace(",", ""); //ไม่ต้องการเครื่องหมายคอมมาร์
      numberBath = numberBath.replace(" ", ""); //ไม่ต้องการช่องว่าง
      numberBath = numberBath.replace("บาท", ""); //ไม่ต้องการตัวหนังสือ บาท
      numberBath = numberBath.replace("฿", ""); //ไม่ต้องการสัญลักษณ์สกุลเงินบาท
    }
    //สร้างอะเรย์เก็บค่าที่ต้องการใช้เอาไว้
    var TxtNumArr = new Array("ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ");
    var TxtDigitArr = new Array("", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน");
    var BahtText = "";
    //ตรวจสอบดูซะหน่อยว่าใช่ตัวเลขที่ถูกต้องหรือเปล่า ด้วย isNaN == true ถ้าเป็นข้อความ == false ถ้าเป็นตัวเลข
    if (isNaN(numberBath)) {
      return "ข้อมูลนำเข้าไม่ถูกต้อง";
    } else {
      //ตรวสอบอีกสักครั้งว่าตัวเลขมากเกินความต้องการหรือเปล่า
      if ((numberBath - 0) > 9999999.9999) {
        return "ข้อมูลนำเข้าเกินขอบเขตที่ตั้งไว้";
      } else {
        //พรากทศนิยม กับจำนวนเต็มออกจากกัน (บาปหรือเปล่าหนอเรา พรากคู่เขา)
        numberBath = numberBath.split(".");
        //ขั้นตอนต่อไปนี้เป็นการประมวลผลดูกันเอาเองครับ แบบว่าขี้เกียจจะจิ้มดีดแล้ว อิอิอิ
        if (numberBath[1].length > 0) {
          numberBath[1] = numberBath[1].substring(0, 2);
        }
        var numberBathLen = numberBath[0].length - 0;
        for (var i = 0; i < numberBathLen; i++) {
          var tmp = numberBath[0].substring(i, i + 1) - 0;
          if (tmp != 0) {
            if ((i == (numberBathLen - 1)) && (tmp == 1)) {
              BahtText += "เอ็ด";
            } else
              if ((i == (numberBathLen - 2)) && (tmp == 2)) {
                BahtText += "ยี่";
              } else
                if ((i == (numberBathLen - 2)) && (tmp == 1)) {
                  BahtText += "";
                } else {
                  BahtText += TxtNumArr[tmp];
                }
            BahtText += TxtDigitArr[numberBathLen - i - 1];
          }
        }
        BahtText += "บาท";
        if ((numberBath[1] == "0") || (numberBath[1] == "00")) {
          BahtText += "ถ้วน";
        } else {
          let DecimalLen = numberBath[1].length - 0;
          for (var i = 0; i < DecimalLen; i++) {
            var tmp = numberBath[1].substring(i, i + 1) - 0;
            if (tmp != 0) {
              if ((i == (DecimalLen - 1)) && (tmp == 1)) {
                BahtText += "เอ็ด";
              } else
                if ((i == (DecimalLen - 2)) && (tmp == 2)) {
                  BahtText += "ยี่";
                } else
                  if ((i == (DecimalLen - 2)) && (tmp == 1)) {
                    BahtText += "";
                  } else {
                    BahtText += TxtNumArr[tmp];
                  }
              BahtText += TxtDigitArr[DecimalLen - i - 1];
            }
          }
          BahtText += "สตางค์";
        }
        return BahtText;
      }
    }
  }
}