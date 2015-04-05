//// Plugins
/* Scrolling lock - $(item).lockingScrollDown(forceDown), as soon as this method is called once, whenever the element is scrolled, it will check if it was previously locked in the bottom, and either scroll down or leave position otherwise, (true) will force it to bottom.
*/jQuery.fn.lockingScrollDown=function(e){return $(this).each(function(t,n){if(!$(n).data("lockingScrollSetup")){var r=function(){$(this).data("lockingScrollLocked",!!($(this).prop("scrollTop")==$(this).prop("scrollHeight")-$(this).height()))};$(n).scroll(r);r.call($(n));$(n).data("lockingScrollSetup",true)}if(e){$(n).data("lockingScrollLocked",true)}if(!!$(n).data("lockingScrollLocked")){$(n).prop("scrollTop",$(n).prop("scrollHeight"))}})}
/* Center Element
*/jQuery.fn.center=function(){return this.each(function(){var $self=jQuery(this);if($self.parent().css("position")=='static'){$self.parent().css("position","relative")};$self.css({top:'50%',marginTop:(($self.outerHeight()/2)*-1)+'px',left:'50%',marginLeft:(($self.outerWidth()/2)*-1)+'px',position:'absolute'})})};
/* Serialize form to {obj}
*/jQuery.fn.serializeObject=function(){var o={};var a=this.serializeArray();jQuery.each(a,function(){if(o[this.name]!==undefined){if(!o[this.name].push){o[this.name]=[o[this.name]]}o[this.name].push(this.value||'')}else{o[this.name]=this.value||''}});return o};
/* HSV to RGB converter
*/var hsv2rgb = function(e,t,n){var r,i,s;var o=new Array;if(t==0){r=i=s=Math.round(n*255)}else{var u=e*6;if(u==6)u=0;var a=Math.floor(u);var f=n*(1-t);var l=n*(1-t*(u-a));var c=n*(1-t*(1-(u-a)));if(a==0){var_r=n;var_g=c;var_b=f}else if(a==1){var_r=l;var_g=n;var_b=f}else if(a==2){var_r=f;var_g=n;var_b=c}else if(a==3){var_r=f;var_g=l;var_b=n}else if(a==4){var_r=c;var_g=f;var_b=n}else{var_r=n;var_g=f;var_b=l}r=("00"+Math.round(var_r*255).toString(16)).slice(-2);i=("00"+Math.round(var_g*255).toString(16)).slice(-2);s=("00"+Math.round(var_b*255).toString(16)).slice(-2)}return"#"+r+i+s}
/* Generate an array of evenly distributed numbers
*/var distributedFactionArray=function(e){var t=1,n=0,r=[],i=[];for(var s=0,s=0;s<e;s++){r.push((n*2+1)*(1/(t*2)));if(++n==t){t*=2;n=0;i=i.concat(r);r=[]}}i=i.concat(r);return i;}