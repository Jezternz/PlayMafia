//// Plugins
/* Scrolling lock - $(item).lockingScrollDown(forceDown), as soon as this method is called once, whenever the element is scrolled, it will check if it was previously locked in the bottom, and either scroll down or leave position otherwise, (true) will force it to bottom.
*/jQuery.fn.lockingScrollDown=function(e){return $(this).each(function(t,n){if(!$(n).data("lockingScrollSetup")){var r=function(){$(this).data("lockingScrollLocked",!!($(this).prop("scrollTop")==$(this).prop("scrollHeight")-$(this).height()))};$(n).scroll(r);r.call($(n));$(n).data("lockingScrollSetup",true)}if(e){$(n).data("lockingScrollLocked",true)}if(!!$(n).data("lockingScrollLocked")){$(n).prop("scrollTop",$(n).prop("scrollHeight"))}})}
/* Center Element
*/jQuery.fn.center=function(){return this.each(function(){var $self=jQuery(this);if($self.parent().css("position")=='static'){$self.parent().css("position","relative")};$self.css({top:'50%',marginTop:(($self.outerHeight()/2)*-1)+'px',left:'50%',marginLeft:(($self.outerWidth()/2)*-1)+'px',position:'absolute'})})};
/* Add disabled input values to val() & Serialize
*/(function(e){var t=e.fn.val;var n=function(e){return encodeURIComponent(e).replace(/[%20]/gim,"+")};jQuery.fn.val=function(n){if(this.prop("disabled")){if(typeof n=="undefined"){return this.first().data("before-disabled-value")}else{this.each(function(){e(this).data("before-disabled-value",n)})}}return t.apply(this,arguments)};var r=e.fn.prop;jQuery.fn.prop=function(t,n){if(typeof n!="undefined"&&t=="disabled"){this.each(function(){e(this).data("before-disabled-value",e(this).val())})}return r.apply(this,arguments)};var i=e.fn.attr;jQuery.fn.attr=function(t,n){if(typeof n!="undefined"&&t=="disabled"){this.each(function(){e(this).data("before-disabled-value",e(this).val())})}return i.apply(this,arguments)};var s=e.fn.serialize;jQuery.fn.serialize=function(){var t=s.apply(this,arguments);this.find("input[disabled], textarea[disabled], select[disabled]").each(function(){if(t.length!=0)t+="&";t+=n(e(this).attr("name"))+"="+n(e(this).data("before-disabled-value"))});return t};var o=e.fn.serializeArray;jQuery.fn.serializeArray=function(){var t=o.apply(this,arguments);this.find("input[disabled], textarea[disabled], select[disabled]").each(function(){t.push({name:e(this).attr("name"),value:e(this).data("before-disabled-value")})});return t}})(jQuery);
/* Serialize form into array
*/(function(e){e.fn.serializeObject=function(){var e={};this.serializeArray().forEach(function(t){e[t.name]=t.value});return e}})(jQuery);
/* Jquery Cookie plugin
*/(function(e){if(typeof define==="function"&&define.amd){define(["jquery"],e)}else{e(jQuery)}})(function(e){function n(e){return e}function r(e){return decodeURIComponent(e.replace(t," "))}function i(e){if(e.indexOf('"')===0){e=e.slice(1,-1).replace(/\\"/g,'"').replace(/\\\\/g,"\\")}try{return s.json?JSON.parse(e):e}catch(t){}}var t=/\+/g;var s=e.cookie=function(t,o,u){if(o!==undefined){u=e.extend({},s.defaults,u);if(typeof u.expires==="number"){var a=u.expires,f=u.expires=new Date;f.setDate(f.getDate()+a)}o=s.json?JSON.stringify(o):String(o);return document.cookie=[s.raw?t:encodeURIComponent(t),"=",s.raw?o:encodeURIComponent(o),u.expires?"; expires="+u.expires.toUTCString():"",u.path?"; path="+u.path:"",u.domain?"; domain="+u.domain:"",u.secure?"; secure":""].join("")}var l=s.raw?n:r;var c=document.cookie.split("; ");var h=t?undefined:{};for(var p=0,d=c.length;p<d;p++){var v=c[p].split("=");var m=l(v.shift());var g=l(v.join("="));if(t&&t===m){h=i(g);break}if(!t){h[m]=i(g)}}return h};s.defaults={};e.removeCookie=function(t,n){if(e.cookie(t)!==undefined){e.cookie(t,"",e.extend({},n,{expires:-1}));return true}return false}});
/* HSV to RGB converter
*/var hsv2rgb = function(e,t,n){var r,i,s;var o=new Array;if(t==0){r=i=s=Math.round(n*255)}else{var u=e*6;if(u==6)u=0;var a=Math.floor(u);var f=n*(1-t);var l=n*(1-t*(u-a));var c=n*(1-t*(1-(u-a)));if(a==0){var_r=n;var_g=c;var_b=f}else if(a==1){var_r=l;var_g=n;var_b=f}else if(a==2){var_r=f;var_g=n;var_b=c}else if(a==3){var_r=f;var_g=l;var_b=n}else if(a==4){var_r=c;var_g=f;var_b=n}else{var_r=n;var_g=f;var_b=l}r=("00"+Math.round(var_r*255).toString(16)).slice(-2);i=("00"+Math.round(var_g*255).toString(16)).slice(-2);s=("00"+Math.round(var_b*255).toString(16)).slice(-2)}return"#"+r+i+s}
/* Generate an array of evenly distributed numbers
*/var distributedFactionArray=function(e){var t=1,n=0,r=[],i=[];for(var s=0,s=0;s<e;s++){r.push((n*2+1)*(1/(t*2)));if(++n==t){t*=2;n=0;i=i.concat(r);r=[]}}i=i.concat(r);return i;}