!function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a="function"==typeof require&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}for(var i="function"==typeof require&&require,o=0;o<r.length;o++)s(r[o]);return s}({1:[function(require,module,exports){!function($){var myAccountUrl="http://myaccount.umn.edu/lookup?SET_INSTITUTION=UMNTC&type=name&campus=a&role=any&CN=",deptUrl="https://directory.umn.edu/search?q=",peopleUrl="https://myaccount.umn.edu/lookup?format=JSON&CN=",usearch="https://usearch.umn.edu/?query=",search={get:{queryVariable:function(variable){for(var query=window.location.search.substring(1),vars=query.split("&"),i=0;i<vars.length;i++){var pair=vars[i].split("=");if(pair[0]==variable)return pair[1]}return!1},query:function(){var q=search.get.queryVariable("query");return q},campus:function(){var x=window.location.href,x=x.split("/").pop().split("?")[0];return""==x?"tc":"all-campuses"==x?"all":x}},check:{space:function(){var q=search.get.query(),s="%20";return q.indexOf(s)!==-1},url:function(){var u=window.location.href;return u.indexOf("search-results")>-1},queryLength:function(){var q=search.get.query();return q.length>0}},replace:{plus:function(){var s=/\%20/gi,q=search.get.query(),q=q.replace(s,"+");return q}},click:{filter:function(){var $f=$(".search-menu__link"),q=search.check.queryLength();1==q?$f.click(function(){var id=$(this).attr("id");switch(id){case"search-people":$(this).attr("href",myAccountUrl+search.replace.plus());break;case"search-depts":$(this).attr("href",deptUrl+search.replace.plus());break;case"search-web":$(this).attr("href",usearch+window.location.href)}}):$f.click(function(){var id=$(this).attr("id");switch(id){case"search-people":$(this).attr("href",myAccountUrl);break;case"search-depts":$(this).attr("href",deptUrl);break;case"search-web":$(this).attr("href",usearch+window.location.href)}})},campusMatch:function(){var c=search.get.campus();$("select#campus_select option").prop("selected",!1),$("select#campus_select option[value="+c+"]").prop("selected",!0)},campusSelect:function(){var $c=$("select#campus_select");$c.change(function(){var q="?query="+search.get.query(),linkID=$(this).find(":selected").val();switch(linkID){case"all":console.log("selected: all campuses"),location="https://usearch.umn.edu/all-campuses"+q;break;case"crookston":console.log("selected: crookston"),location="https://usearch.umn.edu/"+linkID+q;break;case"duluth":console.log("selected: duluth"),location="https://usearch.umn.edu/"+linkID+q;break;case"morris":console.log("selected: morris"),location="https://usearch.umn.edu/"+linkID+q;break;case"rochester":console.log("selected: rochester"),location="https://usearch.umn.edu/"+linkID+q;break;case"tc":console.log("selected: twin cities"),location="https://usearch.umn.edu/"+q;break;case"onestop":console.log("selected: onestop"),location="https://usearch.umn.edu/"+linkID+q}})}},people:{makeContainer:function(){var $main=$(".search-results-area"),$div="<div class='people-search__container'><h2 id='um_srch_people_header' class='people-search__header h4'>People Search Results</h2><div class='people-search__list-container'></di></div>";$main.append($div)},callAPI:function(){var q=search.get.query(),theUrl=peopleUrl+q;$.ajax({url:theUrl,type:"GET",dataType:"json",async:!1,xhrFields:{withCredentials:!1},success:function(response){$(".people-search__list-container, .people-search__svg-placeholder").empty(),$(".people-search__svg-placeholder").toggleClass("active");var peopleHtml="<div role='list' id='people-search__items' class='people-search__results'>";if(response&&response.people&&response.people.length>0)for(var people=response.people,i=("<div class='search-results__total'>Total results: "+response.people.length+"</div>",0);i<=response.people.length;i++)$.isEmptyObject(people[i])||(peopleHtml+="<div role='listitem' class='people-search__result'><a class='people-search__name people-search__result-item' href='https://myaccount.umn.edu/lookup?SET_INSTITUTION=UMNTC&UID="+people[i].uid+"'>"+people[i].freeFormName+" ("+people[i].persontypelist+")</a>",people[i].umnRegUnit.length>0&&"student"==people[i].persontypelist&&(peopleHtml+="<div class='people-search__reg-unit people-search__result-item'>"+people[i].umnRegUnit+"</div>"),people[i].ou.length>0&&(peopleHtml+="<div class='people-search__dept people-search__result-item'>"+people[i].ou+"</div>"),people[i].email.length>0&&(peopleHtml+="<a class='people-search__email people-search__result-item' href='mailto:"+people[i].email+"'>"+people[i].email+"</a>"),people[i].workphone.length>0&&(peopleHtml+="<a class='people-search__tel people-search__result-item' href='tel:"+people[i].workphone+"'>"+people[i].workphone+"</a>"),peopleHtml+="</div>");else peopleHtml+="<span> No people found.</span>";peopleHtml+="</div></div></div>",response.people&&response.people.length>1&&(peopleHtml+="<div id='um_srch_people_footer' style='margin-top:10px;'><a href='https://www.umn.edu/lookup?SET_INSTITUTION=UMNTC&amp;type=name&amp;campus=a&amp;role=any&amp;CN="+q+"'>View more People Search results</a></div>"),$(".people-search__list-container").append(peopleHtml)},error:function(err){console.log(err),$(".people-search__list-container").empty();var peopleHtml="<div role='list' id='people-search__items'>";peopleHtml+="<span> No people found.</span></div>",$(".people-search__list-container").append(peopleHtml)}})}},init:function(){console.log("running custom CSE"),search.click.campusMatch(),search.click.campusSelect(),search.click.filter(),search.check.queryLength(),0!=search.get.queryVariable("query")?search.people.callAPI():$(".people-search__container").empty()}};window.onload=function(){search.init()}}(jQuery)},{}]},{},[1]);
