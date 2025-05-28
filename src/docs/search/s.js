(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function ($) {
  //global variables
  var usearch = "https://usearch.umn.edu/?query=";

  //the main search functions
  var search={

    get: {
      queryVariable: function (variable){
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
                var pair = vars[i].split("=");
                if(pair[0] == variable){return pair[1];}
        }
        return(false);
      },

      query: function (){
        //shorter way to get the query
        var q = search.get.queryVariable("query");
        return q;
      },

      campus: function(){
        //get the campus location from the URL
        var x = window.location.href;
        var x = x.split('/').pop().split('?')[0];

        if(x==""){
          return "tc";
        }else if(x=="all-campuses"){
          return "all";
        }else{
          return x;
        }
      }
    },

    check:{
      space: function(){
        //check if the search query contains spaces
        var q = search.get.query();
        var s = '%20';
        if(q.indexOf(s) !== -1){
          return true;
        }else{
          return false;
        }
      },

      url: function(){
        //check the current page url
        var u = window.location.href;

        if(u.indexOf("search-results") > -1) {
           return true;
        }else{
          return false;
        }
      },

      queryLength:function(){
        var q = search.get.query();
        if(q.length > 0){
          //console.log('search is NOT blank, see: ' + q);
          return true;
        }else{
          //console.log('search is blank, see: ' + q);
          return false;
        }
      }
    },

    replace:{
      plus: function(){
        var s = /\%20/gi;
        var q = search.get.query();
        var q = q.replace(s, '+' );
        return q;
      }
    },

    click:{
      filter: function(){
        //define the links
        var $f = $('.search-menu__link');

        //check if a search has been made
        var q = search.check.queryLength();

        if (q == true){

          //what to do when clicked and there is a search query
          $f.click(function(){
            //don't do anything with links yet
            //e.preventDefault();
            //get the id of the link clicked
            var id = $(this).attr('id');

            //now do things depending on the id
            switch (id){

              case 'search-web':
                $(this).attr('href', usearch + search.replace.plus());
                break;
            }

          });
        } else {
          //no search query query
          //what to do when clicked
          $f.click(function(){
            //don't do anything with links yet
            //e.preventDefault();
            //get the id of the link clicked
            var id = $(this).attr('id');

            //now do things depending on the id
            switch (id){

              case 'search-web':
                $(this).attr('href', usearch + search.replace.plus());
                break;
            }

          });
        }


      },

      campusMatch:function(){
        var c = search.get.campus();
        //console.log("campus = " + c);

        $("select#campus_select option").prop("selected", false); //deselect all
        $("select#campus_select option[value="+c+"]").prop("selected", true); //select only the matching option

      },

      campusSelect:function(){
       var $c = $("select#campus_select");

       $c.change(function() {
         //base url
         var w="";

         //search value
         var q = "?query=" + search.get.query();

         //get value of selection
         var linkID= $(this).find(':selected').val();

         switch (linkID){
           case 'all':
             //location = c_default;
             console.log("selected: all campuses");
             location = "https://usearch.umn.edu/all-campuses" + q;
             break;
           case 'crookston':
             console.log("selected: crookston");
             location = "https://usearch.umn.edu/" + linkID + q;
             break;
           case 'duluth':
             console.log("selected: duluth");
             location = "https://usearch.umn.edu/" + linkID + q;
             break;
           case 'morris':
             console.log("selected: morris");
             location = "https://usearch.umn.edu/" + linkID + q;
             break;
           case 'rochester':
             console.log("selected: rochester");
             location = "https://usearch.umn.edu/" + linkID + q;
             break;
           case 'tc':
             console.log("selected: twin cities");
             location = "https://usearch.umn.edu/" + q;
             break;
           case 'onestop':
             console.log("selected: onestop");
             location = "https://usearch.umn.edu/" + linkID + q;
             break;
           }
       });
     }
    },

    //run everything on init
    init: function(){
      //run campus select
      console.log("running custom CSE");
      search.click.campusMatch();
      search.click.campusSelect();
      search.click.filter();
      search.check.queryLength();
    }
  }

//run everything once the page loads
window.onload = function() {
  search.init();
};
}(jQuery));

},{}]},{},[1])
