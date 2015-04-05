$(function(){
	new MafWebPage();
});
function MafWebPage()
{
	var
		statsURI = '/json/maf_stats.json',
		logURI = '/json/maf_changelog.json';

	var
		loadingStats = false,
		loadingLog = false;
	
	var constructor = function()
	{
		refreshStats();
		refreshLog();
		$('#loading_stats_icon').on('click', refreshStats);
		$('#loading_log_icon').on('click', refreshLog);
        if(window.location.pathname == "/info")
        {
            new GameInfoManager();
        }
	}
	var refreshStats = function()
	{
		if(loadingStats)return;
		loadingStats = true;
		$('#loading_stats_icon').addClass('loading');
		$('#gamestats').hide();
		$('#statsloading').show();
		get(statsURI, function(data) {
			$('#players_online_value').html(data.players.online);
			$('#players_total_value').html(data.players.total);
			$('#games_online_value').html(data.games.online);
			$('#games_total_value').html(data.games.total);
			$('#loading_stats_icon').removeClass('loading');
			$('#statsloading').hide();
			$('#gamestats').show();
			loadingStats = false;
		});
	}
	var refreshLog = function()
	{
		if(loadingLog)return;
		loadingLog = true;
		$('#loading_log_icon').addClass('loading');
		$('#changelog_container').hide();
		$('#logloading').show();
		get(logURI, function(data) {
			$('#changelog_container').empty();
			data.updates.forEach(function(update)
			{
				var updateStr = '<h3>'+update.label+' - '+update.date+'</h3>';
				update.items.forEach(function(item){
					updateStr += '<div class="update">'+item+'</div>';
				});
				$('#changelog_container').append(updateStr);
				$('#loading_log_icon').removeClass('loading');
				$('#logloading').hide();
				$('#changelog_container').show();
				loadingLog = false;
			});		
		});	
	}
	var get = function(url, callback)
	{
		$.getJSON(url)
			.done(function(data)
			{
				callback.call({}, data);
			})
			.fail(function(data)
			{
				callback.call({}, null);
				console.log('ajax failed', arguments);
			});
	}
	
	constructor.apply(this, arguments);
}
function GameInfoManager()
{
    var
        websiteLanguage = "english",
        websiteSubLanguage = "plain";
        
    var
        langTemplate = "/languages/{0}/{1}.lang.json",
        langHelpTemplate = "/languages/{0}/{1}.lang.help.xml";
        
    var
        gameConfigUri = '/json/game.config.json';

    var 
        helpPages = false,
        topHelpPage = false,
        currentHelpPage = false,
        langConfig = false,
        gameConfig = false;

    var constructor = function()
    {
        $('#help_container').on('click', helpClicked);
        $.getJSON(gameConfigUri, function(data)
        {
            gameConfig = data;
            loadLanguage(function()
            {
                initHelper();
            });
        });
    }
    var loadLanguage = function(callback)
    {
        var fileName = langTemplate.replace("{0}", websiteLanguage).replace("{1}", websiteSubLanguage);
        $.getJSON(fileName)
            .success(function(jsondata){
                fileName = langHelpTemplate.replace("{0}", websiteLanguage).replace("{1}", websiteSubLanguage);
                $.ajax(fileName,
                    {
                        'dataType':'html',
                        'success':function(xmldata){
                            langConfig = {
                                'textjson':jsondata,
                                'helpxml':xmldata
                            };
                            callback.call();
                        }
                    }
                );
            });
    }
    
    var initHelper = function()
    {
        topHelpPage = false;
        helpPages = {};
        $('#help_body_container').empty();
        
        var templObj = {
            'lang':langConfig.textjson,
            'logic':gameConfig
        };
        var templData = langConfig.helpxml;
        var tmplResult = ApplyTemplate(templObj, templData);            
        $(tmplResult).each(function(i, el)
        {
            if(el.nodeType!=1)return;
            var 
                $el = $(el), 
                id = $el.data('mhelpid'),
                top = ($el.data('mstart') == "1"),
                html = $(el).prop('outerHTML'),
                parent = top ? false : ($el.data('mhelpparent') || ""),
                displayname = $el.data('mhelpdisplay');    
            helpPages[id] = {
                'html':html,
                'id':id,
                'display':displayname,
                'parent': parent
            }
            if(top)
            {
                topHelpPage = id;
            }                
        });
        toHelpPage(topHelpPage);
    }
    var helpClicked = function(ev)
    {
        var target = $(ev.target);
        if(target.data('mlinkid'))
        {
            toHelpPage(target.data('mlinkid'));
        }
    }
    var rebuildHelpNav = function()
    {
        $('#help_address_container').empty();
        var recursiveNB = function(id){
            var parentId = helpPages[id].parent;
            if(parentId!==false)
            {
                parentId = parentId==""?topHelpPage:parentId;
                recursiveNB(parentId);
                $('<span class="help_addr_seperator">&nbsp;&gt;&nbsp;</span>').appendTo('#help_address_container');
            }
            $('<span class="help_addr_item" data-mlinkid="'+id+'">'+helpPages[id].display+'</span>').appendTo('#help_address_container');
        }
        recursiveNB(currentHelpPage);
    }
    var toHelpPage = function(pageId)
    {
        $('#help_body_container').empty();
        if(typeof helpPages[pageId] == 'undefined')
        {
            currentHelpPage = 'notfound';
            $(helpPages[currentHelpPage].html).appendTo('#help_body_container');
        }
        else
        {
            currentHelpPage = pageId;
            $(helpPages[currentHelpPage].html).appendTo('#help_body_container');
        }
        rebuildHelpNav();
    }
    
    constructor.apply(this, arguments);
}