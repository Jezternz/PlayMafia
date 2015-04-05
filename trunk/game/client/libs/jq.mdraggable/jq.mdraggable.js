/*
    config:
    $(draggable_target).mdraggable({
    
    });
    
*/
$(function(){
$.fn.mdraggable = function(opts) {$(this).each(function(){opts.element = $(this);new function(){
    var
        overlayCSS = {'position':'absolute','top':'0','right':'0','bottom':'0','left':'0','z-index':'99999'},
        cursorCSS = {'n':'n-resize','ne':'ne-resize','e':'e-resize','se':'se-resize','s':'s-resize','sw':'sw-resize','w':'w-resize','nw':'nw-resize','move':'move'};

    var 
        targetElem = false,
        sizeHandles = {'n':0,'ne':0,'e':0,'se':0,'s':0,'sw':0,'w':0,'nw':0,'move':0},
        changeCallback = 0,
        propsOriginal = {'w':0,'h':0,'x':0,'y':0},
        propsCurrent = {'w':0,'h':0,'x':0,'y':0},
        limits = {'top':0,'right':0,'bottom':0,'left':0,'maxwidth':-1,'maxheight':-1,'minwidth':0,'minheight':0},
        attachX = "left",
        attachY = "top",
        attachModifierX = 1,
        attachModifierY = 1,
        dragActive=false;
    
    var constructor = function()
    {
        if(!opts.element)throw new Error("No 'element' passed into JQDraggable constructor.");
        targetElem = opts.element;
        Object
            .keys(sizeHandles)
            .filter(function(hKey){return typeof opts[hKey+"-handle"] != "undefined";})
            .forEach(function(hKey){sizeHandles[hKey] = opts[hKey+"-handle"];});
        Object
            .keys(limits)
            .filter(function(hKey){return typeof opts[hKey+"-limit"] != "undefined";})
            .forEach(function(hKey){limits[hKey] = parseInt(opts[hKey+"-limit"]);});
        changeCallback = opts.onchange || function(){};
        attachX = opts.attachx == "right" ? "right" : "left";
        attachY = opts.attachy == "bottom" ? "bottom" : "top";
        attachModifierX = attachX == "left" ? 1 : -1;
        attachModifierY = attachY == "top" ? 1 : -1;
        propsOriginal.w = propsCurrent.w = parseInt(opts.width || targetElem.css('width') || 0);
        propsOriginal.h = propsCurrent.h = parseInt(opts.height || targetElem.css('height') || 0);
        propsOriginal.x = propsCurrent.x = parseInt(opts.posx || targetElem.css(attachX) || 0);
        propsOriginal.y = propsCurrent.y = parseInt(opts.posy || targetElem.css(attachY) || 0);
        setupDraggable();
    }
    var setupDraggable = function()
    {
        Object
            .keys(sizeHandles)
            .filter(function(hKey){return !!sizeHandles[hKey];})
            .forEach(function(hKey){
                sizeHandles[hKey]
                    .on('mousedown', dragFn(hKey))
                    .css('cursor', cursorCSS[hKey]);
            });
    }
    var dragFn = function(type)
    {
        return function(e)
        {
            if($(e.target).closest('.draggable_exclude').size() == 0 && !dragActive)
            {
                propsOriginal.w = propsCurrent.w = parseInt(targetElem.css('width') || propsOriginal.w || 0);
                propsOriginal.h = propsCurrent.h = parseInt(targetElem.css('height') || propsOriginal.h || 0);
                propsOriginal.x = propsCurrent.x = parseInt(targetElem.css(attachX) || propsOriginal.x || 0);
                propsOriginal.y = propsCurrent.y = parseInt(targetElem.css(attachY) || propsOriginal.y || 0);
                new Drag(type, e);
            }
        }
    }
    
    function Drag()
    {
        var 
            dragType,
            overlayEl,
            dragStartMouseX,
            dragStartMouseY,
            dragCurrentMouseX,
            dragCurrentMouseY;
            
        // Event driven methods;   
        var start = function(type, e)
        {
            dragActive = true;
            e.preventDefault();
            dragType = type;
            dragStartMouseX = dragCurrentMouseX = e.clientX;
            dragStartMouseY = dragCurrentMouseY = e.clientY;
            overlayEl = $('<div></div>');            
            overlayEl
                .on('mousemove', tick)
                .css(overlayCSS)
                .css('cursor', cursorCSS[dragType])
                .appendTo('body');
            $(window).on('mouseup', end);
        }
        var tick = function(e)
        {
            dragCurrentMouseX = e.clientX;
            dragCurrentMouseY = e.clientY;
            change();
        }
        var end = function(e)
        {
            $(window).off('mouseup', end);
            dragCurrentMouseX = e.clientX;
            dragCurrentMouseY = e.clientY;
            change();
            save();
            // cleanup
            overlayEl.remove();
            overlayEl = null;
            dragActive = false;
        }
        
        // other methods
        var change = function()
        {
            var temp = {'x':propsCurrent.x,'y':propsCurrent.y,'w':propsCurrent.w,'h':propsCurrent.h};
            if(dragType=="move")
            {
                temp.x = propsOriginal.x - ((dragStartMouseX-dragCurrentMouseX)*attachModifierX);
                temp.y = propsOriginal.y - ((dragStartMouseY-dragCurrentMouseY)*attachModifierY);
                
                processBoundaryTests(temp, true);    
            }
            else
            {
                // do x 
                if(dragType == 'ne' || dragType == 'e' || dragType == 'se')
                {
                    var trial = objCopy(temp);                
                    trial.w = propsOriginal.w - (dragStartMouseX-dragCurrentMouseX);   
                    if(attachX=="right")
                    {
                        trial.x = propsOriginal.x + (dragStartMouseX-dragCurrentMouseX);
                    }
                    if(processBoundaryTests(trial))
                    {
                        temp = trial;
                    }
                }
                else if(dragType == 'nw' || dragType == 'w' || dragType == 'sw')
                {
                    var trial = objCopy(temp);
                    trial.w = propsOriginal.w + (dragStartMouseX-dragCurrentMouseX);
                    if(attachX=="left")
                    {
                        trial.x = propsOriginal.x - (dragStartMouseX-dragCurrentMouseX);
                    }
                    if(processBoundaryTests(trial))
                    {
                        temp = trial;
                    }
                }
                
                // then y
                if(dragType == 'nw' || dragType == 'n' || dragType == 'ne')
                {
                    var trial = objCopy(temp);
                    trial.h = propsOriginal.h + (dragStartMouseY-dragCurrentMouseY);
                    if(attachY=="top")
                    {
                        trial.y = propsOriginal.y - (dragStartMouseY-dragCurrentMouseY);
                    }
                    if(processBoundaryTests(trial))
                    {
                        temp = trial;
                    }
                }
                else if(dragType == 'sw' || dragType == 's' || dragType == 'se')
                {
                    var trial = objCopy(temp);
                    trial.h = propsOriginal.h - (dragStartMouseY-dragCurrentMouseY);    
                    if(attachY=="bottom")
                    {
                        trial.y = propsOriginal.y + (dragStartMouseY-dragCurrentMouseY);
                    }
                    if(processBoundaryTests(trial))
                    {
                        temp = trial;
                    }
                }
                processBoundaryTests(temp);
            }
            
            propsCurrent.x = temp.x;
            propsCurrent.y = temp.y;   
            propsCurrent.w = temp.w;
            propsCurrent.h = temp.h;
                
            update();
        }
        var processBoundaryTests = function(temp, isMove)
        {
            var changeNeeded = true;
            // check size bounds first
            if(!isMove)
            {
                if(limits.minwidth != -1 && temp.w < limits.minwidth)
                {
                    temp.w = limits.minwidth;
                    changeNeeded = false;
                }
                else if(limits.maxwidth != -1 && temp.w > limits.maxwidth)
                {
                    temp.w = limits.maxwidth;
                    changeNeeded = false;
                }
                if(limits.minheight != -1 && temp.h < limits.minheight)
                {
                    temp.h = limits.minheight;
                    changeNeeded = false;
                }
                else if(limits.maxheight != -1 && temp.h > limits.maxheight)
                {
                    temp.h = limits.maxheight;
                    changeNeeded = false;
                }
            }
            
            // check if out of bounds
            // on x axis
            var 
                windowWidth = $(window).width(),
                tPosOppositeX = windowWidth-(temp.x+temp.w), 
                oppositeAttachX = attachX == "left" ? "right" : "left";
            if(temp.x < limits[attachX])
            {
                temp.x = limits[attachX];
                changeNeeded = false;
            }
            else if(tPosOppositeX < limits[oppositeAttachX])
            {
                if(isMove)
                {
                    temp.x = windowWidth-(limits[oppositeAttachX]+temp.w);
                }
                else
                {
                    temp.w = (windowWidth-limits[oppositeAttachX])-temp.x;
                }
                changeNeeded = false;
            }
            
            // on y axis
            var 
                windowHeight = $(window).height(),
                tPosOppositeY = windowHeight-(temp.y+temp.h), 
                oppositeAttachY = attachY == "top" ? "bottom" : "top";
            if(temp.y < limits[attachY])
            {
                temp.y = limits[attachY];
                changeNeeded = false;
            }
            else if(tPosOppositeY < limits[oppositeAttachY])
            {
                if(isMove)
                {
                    temp.y = windowHeight-(limits[oppositeAttachY]+temp.h);
                }
                else
                {
                    temp.h = (windowHeight-limits[oppositeAttachY])-temp.y;
                }
                changeNeeded = false;
            }
            
            // if is, either check if height is to be used or not to fix, modify temp appropriately
            return changeNeeded;
        }
        var objCopy = function(obj)
        {
            var obj2 = {};
            for(var key in obj)obj2[key] = obj[key];
            return obj2;
        }
        var update = function()
        {
            var cssUpdate = {};
            cssUpdate["width"] = propsCurrent.w+"px";
            cssUpdate["height"] = propsCurrent.h+"px";
            cssUpdate[attachX] = propsCurrent.x+"px";
            cssUpdate[attachY] = propsCurrent.y+"px";
            targetElem.css(cssUpdate);
        }
        
        var save = function()
        {
            propsOriginal.x = propsCurrent.x;
            propsOriginal.y = propsCurrent.y;
            propsOriginal.w = propsCurrent.w;
            propsOriginal.h = propsCurrent.h;
            if(changeCallback)
            {
                try
                {
                    changeCallback.call({}, propsOriginal);
                }
                catch(er){
                    console.error('mdraggable rethrown error from onchange callback:', er);
                }
            }
        }
        
        start.apply(this, arguments);
    }
    
    constructor.apply(this, arguments);
}});}});