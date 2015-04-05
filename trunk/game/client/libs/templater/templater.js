(function(){
    
    function Node()
    {
        this.children = [];        
        this.dynamicText = "";
        this.dynamicArea = false;
        this.internalText = "";
        
        this.templateHtml = function()
        {
            if(this.internalText!="")return this.internalText;
            var str = "";
            if(this.dynamicText != "")str += "{"+this.dynamicText+(this.dynamicArea?"}":"/}");
            str += this.children.map(function(el){return el.templateHtml();}).join("");
            if(this.dynamicArea)str += "{/}";
            return str;
        }
        
        this.getTemplatedHtml = function(vobj, level)
        {
            var str = "";
            level = typeof level == 'undefined' ? 0 : level;
            
            
            // standard inner text - apply template vars
            if(this.dynamicText == "")
            {
                str = this.internalText;
                Object
                    .keys(vobj)
                    .filter(function(a){return a.charAt(0) == "$";})
                    .sort(function(a,b){return b.length - a.length;})
                    .forEach(function(k)
                    {
                        str = str.replace(SafeRegExp(k), vobj[k]);
                    });
                str += this.children.map(function(c){
                    return c.getTemplatedHtml(vobj, level);
                }).join('');
            }
            // if standard template var, fill it in
            else if(this.dynamicText.charAt(this.dynamicText.length-2) == "/")
            {
                str = calculateStackedTemplateValue(this.dynamicText, vobj);
            }
            // condition, use template vars & condition to access if should run template on children
            else if(this.dynamicText.charAt(1) == "?")
            {
                // find a way to run standard calculation after ()'s have been calced
                var processChildren = evaluateDynamicCondition(this.dynamicText, vobj);
                if(processChildren)
                {
                    str += this.children.map(function(c){
                        return c.getTemplatedHtml(vobj, level);
                    }).join('');
                }
            }
            // loop
            else
            {
                // increment level
                level++;
                // add to $ vars
                var dollarKey = dollarsLong(level);
                var val = calculateStackedTemplateValue(this.dynamicText, vobj);
                // is an array
                if(Object.prototype.toString.call(val).toLowerCase().indexOf('array') != -1)
                {
                    for(var i=0;i<val.length;i++)
                    {
                        vobj[dollarKey] = (typeof val[i] != "object") ? val[i] : i.toString();
                        str += this.children.map(function(c){
                            return c.getTemplatedHtml(vobj, level);
                        }).join('');
                        delete vobj[dollarKey];
                    }
                }
                else
                {
                    for(var key in val)
                    {
                        vobj[dollarKey] = key;
                        str += this.children.map(function(c){
                            return c.getTemplatedHtml(vobj, level);
                        }).join('');
                        delete vobj[dollarKey];
                    }
                }
            }
            
            return str;
        }
        
        var dollarsLong = function(num)
        {
            var str = "";
            for(var i=0;i<num;i++)str += "$";
            return str;
        }
        
        var evaluateDynamicCondition = function(dynCond, vobj)
        {
            // split (order is important!!! as > must be after >=)            
            var indx, str = '"('+dynCond.replace(new RegExp("[\{\}\?/]+", "gim"), "")+')"';
            var fromIndx = 0;
            while((indx = findNext(str, ['==', '<=', '>=', '!=', '>', '<'], fromIndx))[0] != -1)
            {
                str = str.replace(indx[1], ")\""+indx[1]+"\"(");
                fromIndx = indx[0]+indx[1].length+4;
            }
            return calculateStackedTemplateValue(str, vobj);
        }
        
        var findNext = function(str, ar, offset)
        {
            var closestIndx = Number.MAX_VALUE;
            var closestTag = '';
            offset = offset || 0;
            str = str.substring(offset);
            ar.forEach(function(repl)
            {
                if(str.indexOf(repl) != -1 && str.indexOf(repl) < closestIndx)
                {
                    closestIndx = str.indexOf(repl);
                    closestTag = repl;
                }
            });
            closestIndx = closestIndx==Number.MAX_VALUE ? -1 : offset+closestIndx;
            return [closestIndx, closestTag];
        }
        
        var calculateStackedTemplateValue = function(str, vobj)
        {
            var str2;
            
            str = str.replace(new RegExp("[\{\}/]+", "gim"), "");
            // For each time at least one '(' is remaining, find most inner '(' and deal with it
            while(str.indexOf('(') != -1)
            {
                // find most inner '('
                str2 = str.substring(str.indexOf('(')+1);
                while(str2.indexOf('(') != -1 && str2.indexOf('(') <= str2.indexOf(')'))
                {
                    str2 = str2.substring(str2.indexOf('(')+1);
                }
                // found most inner '('
                str2 = str2.substring(0, str2.indexOf(')'));
                // replace it
                str = str.replace(SafeRegExp("("+str2+")"), calculateTemplateValue(str2, vobj));
            }
            return calculateTemplateValue(str, vobj);
        }
        
        var calculateTemplateValue = function(str, vobj)
        {
            var el, parts = str.split('.');
            
            if(parts.length<=1)
            {
                if(findNext(str, ['==', '<=', '>=', '!=', '>', '<'])[0] != -1)
                {
                    return eval(str);
                }
                else
                {
                    if(str.charAt(0) == "$" && typeof vobj[str] != "undefined")
                    {
                        str = vobj[str];
                    }
                    return str;
                }
            }
            parts.forEach(function(part, i){
                // First item, grab from dict
                if(i==0)
                {
                    el = vobj[part];
                }
                // variable, grab from dict, but use var as index
                else if(part.charAt(0)=='$')
                {
                    el = el[ vobj[part] ];
                }
                else
                {
                    el = el[part];
                }
            });
            return el;
        }
        
        var SafeRegExp = function(s)
        {
            return new RegExp(s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gm');
        }
        
        var constructor = function(str, dyn)
        {
            this.dynamicText = dyn || "";
            this.dynamicArea = this.dynamicText != "" && this.dynamicText.indexOf('/}') == -1;
            
            // Work through all children            
            var indxA, indxB, indxC, tagStr, depth, str2, str3, first, runningIndx;
            while(str.length > 0)
            {
                indxA = str.indexOf('{');
                // no dynamic left
                if(indxA == -1)
                {
                    // This is a text node, no children
                    if(this.children.length==0 && this.dynamicText == "")
                    {
                        this.internalText = str;
                    }
                    // This is the final text node child.
                    else if(str.trim() != "")
                    {
                        this.children.push(new Node(str))
                    }
                    str = "";
                }
                // is a string child
                else if(indxA != 0)
                {
                    var childStr = str.substring(0, indxA);
                    if(childStr.trim() != "")
                    {
                        this.children.push(new Node(childStr));
                    }
                    str = str.substring(indxA);
                }
                // is a dynamic child
                else
                {
                    indxB = str.indexOf('/}');
                    indxC = str.indexOf('}');
                    // If simple single string dynamic
                    if((indxB != -1) && (indxC-1 == indxB))
                    {
                        tagStr = str.substring(indxA, indxC+1);
                        this.children.push(new Node("", tagStr));
                        str = str.substring(indxB+2);
                    }
                    // tree like dynamic
                    else
                    {                    
                        // Walk tree calculate closing tag and parse through center text.
                        first = 0;
                        depth = 0;
                        str2 = str;
                        runningIndx = 0;
                        while(!first++ || depth > 0)
                        {
                            indxB = str2.indexOf('{');
                            indxC = str2.indexOf('}');
                            tagStr = str2.substring(indxB, indxC+1);
                            // {/} - current close tag
                            if(tagStr == "{/}")depth--;
                            // {...} - current is open tag
                            else if(tagStr.indexOf("/") == -1)depth++;
                            str2 = str2.substring(indxC+1);
                            runningIndx += indxC+1;
                        }                        
                        str2 = str.substring(0, runningIndx);
                        
                        // extract dynamicText
                        indxB = str2.indexOf("}");
                        indxC = str2.lastIndexOf("{");
                        
                        // remove tag open & tag close
                        // put innerText into a child node.
                        str3 = str2.substring(0, indxB+1);
                        str2 = str2.substring(indxB+1, indxC);
                        this.children.push(new Node(str2, str3));                 
                        str = str.substring(runningIndx);
                    }
                }
            }
        }
        
        constructor.apply(this, arguments);
    }
    
    var processDocumentTemplate = function(globals, strDoc)
    {
        var root = new Node(strDoc);
        var tmplHtml = root.getTemplatedHtml(globals);
        //throw new Error("work on missing close tags, Cutting off last character some where shouldnt be probably!!!")
        return tmplHtml;
    }
    window.ApplyTemplate = processDocumentTemplate;
})();