const isArr = (a) => {
    return (!!a) && (a.constructor === Array);
};

const isObj = (a) => {
    return (!!a) && (a.constructor === Object);
};

function getKeys(obj) {
    var retObj = {};
    for (var property in obj) {
        if (isObj(obj[property])) {
            retObj[property] = getKeys(obj[property]);
        } else if (isArr(obj[property])) {
            retObj[property] = 'array';
        } else {
            retObj[property] = typeof obj[property];
        }
    }
    return retObj;
}

export { getKeys };
