import fs from 'fs';
import moment from 'moment';
import uuid from 'uuid';
import ethJSUtil from 'ethereumjs-util';
import asyncUtils from 'async';

moment.locale('zh-cn'); // 使用中文

// 格式化时间
exports.formatDate = function(date, friendly) {
  date = moment(date);
  if (friendly) {
    return date.fromNow();
  } else {
    return date.format('YYYY-MM-DD HH:mm');
  }
};

/**
 * 生成随机UUID
 */
exports.genUUid = () => {
  var id = uuid.v4();
  return id.replace(/-/g, "");
}

/**
 * 自动生成从0开始数组
 * @param {Int} to 生成数组长度
 */
exports.intStreamTo = (to) => {
    let arr = []
    for (let i = 0; i < to; i++) {
      arr.push(i)
    }
    return arr
  }
  /**
   * 判断 JSON 对象是否相等
   * @param {JSON} source 
   * @param {JSON} dist 
   */
exports.compareJSON = (source, dist) => {
  return JSON.stringify(source) == JSON.stringify(dist)
}

exports.toAscii = function(hex) {
  return ethJSUtil.toAscii(hex).replace(/\u0000/g, '');
}

exports.valueToKey = function(obj, val) {
  let _key
  if (obj) {
    for (let [key, value] of Object.entries(obj)) {
      if (value == val) {
        _key = key
        break;
      }
    }
  }
  return _key
}

exports.sha3 = function(value) {
  return '0x' + ethJSUtil.sha3(value).toString('hex')
}

exports.cloneObject = function(obj) {
  let result = {}
  for (let [key, value] of Object.entries(obj)) {
    result[key.charAt(0) == '_' ? key.substring(1) : key] = value
  }
  return result
}

exports.last8 = function(aString) {
  if ( aString != undefined && typeof aString == "string" ) {
    return ".." + aString.substr(aString.length - 8);
  } else {
    return aString;
  }
}

exports.getFiles = function(path, files, postfix) {
  fs.readdirSync(path).forEach(function(file) {
    if (!file.endsWith(postfix)){
      return;
    }
    var subpath = path + '/' + file;
    if (fs.lstatSync(subpath).isDirectory()) {
      getFiles(subpath, files, postfix);
    } else {
      files.push(path + '/' + file);
    }
  });
}


exports.intToDecimal = (value,unit) => {
  unit = unit || 100;
  return parseFloat((value/unit).toFixed(unit.toString().length -1));
}

exports.decimalToInt = (value,unit) => {
  unit = unit || 100;
  return parseInt((value*unit).toFixed(0)) ;
}




exports.print = (json) => {
  return JSON.stringify(json);
}


exports.batchMapTasks =(map,task) =>{
   return new Promise((resolve, reject) => {
     asyncUtils.map(map,function (v,callback) {
       task(v).then((data)=>{
         callback(null,data);
       }).catch((err)=>{
         callback(err);
       });
     },(err, result)=>{
         err ? reject(err) : resolve(result);
     });
   });
}