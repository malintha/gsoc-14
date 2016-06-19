finder([1,2],function(results){
    processor(results,onMethodsDone);
});

function onMethodsDone(alert){
    alert(alert);
}

function finder(records,cb){
    setTimeout(function (){
        records.push(3,4,5);
        cb(records); //parse updated records to callback
    },2000);
}

function processor(records,cb){
    setTimeout(function (){
        records.push(6,7,8);
        cb(records);
    },2000);
}
alert("meanwhile I");
