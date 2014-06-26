var finder = {
    run: function(records){
        var self = this;
        setTimeout(function (){
          records.push(3,4);  
          self.trigger('done',[records]);
        },1000);
    }
}

var eventable = {

    on: function(event,cb){
        $(this).on(event,cb);
    },
    trigger: function(event,cb){
        $(this).trigger(event,cb);
    }
}

$.extend(finder,eventable);

finder.run([1,2]);
finder.on('done',function(event,records){
   alert(records);
});
