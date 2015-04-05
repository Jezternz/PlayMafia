$(function(){
	window.MControls = (function(){
		var 
			searchKeyUpTimeout = 400,
			objectKeyUpUpdateTimeout = 600;
		var 
			mafContextMenuClone = $(
				'<div class="mafcontext hidden">'+
					'<div class="context_inner"></div>'+
				'</div>'
			),
			mafContextItemClone = $('<div class="mafcontextitem"></div>'),
			mafDialogContainerClone = $(
				'<div class="mafpopup hidden animated">'+
					'<div class="dialog_center">'+
						'<form type="post">'+
							'<div class="dialog hidden animated">'+
								'<div class="body"></div>'+
							'</div>'+
						'</form>'+
					'</div>'+
				'</div>'
			),
			mafCheckBoxClone = $(
				'<div class="mafcheckbox">'+
					'<div class="maf_checkbox_cirle_container"></div>'+
					'<div class="maf_checkbox_cirle"></div>'+
				'</div>'
			),
			mafDialogOkButtonClone = $('<input type="submit" value="Ok" class="maf_ok mafbutton"/>'),
			mafDialogCancelButtonClone = $('<input type="submit" value="Cancel" class="maf_cancel mafbutton"/>'),
			mafDialogInputClone = $('<input type="text" value="" class="mafinput"/>'),
			mafGroupClone = $('<div class="mafinputgroup"></div>'),
			mafRowClone = $(
				'<div class="setting_row">'+
					'<div class="left_col">'+
						'<div class="inner"></div>'+
						'<div class="indicator_container">'+
							'<div class="modified_indicator"></div>'+
							'<div class="warning_indicator">'+
								'<div class="warning_text">'+
									'<div class="warning_text_title">Warning</div>'+
									'<div class="warning_text_content">_</div>'+
								'</div>'+
								'<div class="warning_arrow"></div>'+
							'</div>'+
						'</div>'+
					'</div>'+
					'<div class="right_col">'+
						'<div class="inner"></div>'+
					'</div>'+
				'</div>'
			),
			mafTextboxClone = $(
				'<div class="text_container control_focusable">'+
					'<input type="text" class="mafinput text" />'+
				'</div>'
			),
			mafPasswordboxClone = $(
				'<div class="password_container control_focusable">'+
					'<input type="password" class="mafinput password" />'+
				'</div>'
			),
			mafNumberboxClone = $(
				'<div class="number_container control_focusable">'+
					'<div class="number_container_input">'+
						'<input type="text" class="mafinput number" />'+
					'</div>'+
					'<div class="number_container_arrows">'+
						'<div class="number_up"><div class="number_inner"></div></div>'+
						'<div class="number_down"><div class="number_inner"></div></div>'+
					'</div>'+
				'</div>'
			),
			mafDropdownboxClone = $(
				'<div class="dropdown_container control_focusable">'+
					'<div class="dropdown_container_input">'+
						'<input type="text" readonly="readonly" class="mafinput dropdown" />'+
					'</div>'+
					'<div class="dropdown_container_arrows">'+
						'<div class="dropdown_down"><div class="dropdown_inner"></div></div>'+
					'</div>'+
					'<div class="dropdown_dropout_container">'+
						'<div class="dropdown_dropout">'+
						'</div>'+
					'</div>'+
				'</div>'
			),
			mafDropdownboxOptionClone = $(
				'<div class="dropdown_dropout_item"></div>'
			),
			mafDropdownsearchboxClone = $(
				'<div class="dropdownsearch_container control_focusable">'+
					'<div class="dropdown_container_input">'+
						'<input type="text" class="mafinput dropdownsearch" />'+
					'</div>'+
					'<div class="dropdown_container_arrows">'+
						'<div class="dropdown_down"><div class="dropdown_inner"></div></div>'+
					'</div>'+
					'<div class="dropdown_dropout_container">'+
						'<div class="dropdown_dropout">'+
						'</div>'+
					'</div>'+
				'</div>'
			),
			mafDropdownsearchboxNoOptionsClone = $(
				'<div class="dropdown_dropout_noitems">No Matches</div>'
			),
			mafListboxClone = $(
				'<div class="list_container control_focusable">'+
					'<div class="list_container_input">'+
						'<input type="text" readonly="readonly" class="mafinput list" />'+
					'</div>'+
					'<div class="list_container_arrows">'+
						'<div class="list_down"><div class="list_inner"></div></div>'+
					'</div>'+
					'<div class="list_dropout_container">'+
						'<div class="list_dropout">'+
							'<div class="list_inner_col">'+
								'<div class="list_inner_row_top">'+
									'<input type="text" class="list_inner_value" readonly="readonly" value="" />'+
									'<div class="list_inner_count">(0)</div>'+
								'</div>'+
								'<div class="list_inner_row_bottom">'+
									'<div class="list_inner_selection list_optionvalues_container"></div>'+
								'</div>'+
							'</div>'+
							'<div class="list_inner_col">'+
								'<div class="list_inner_row_top">'+
									'<input type="text" class="list_inner_search" value="" placeholder="Search" />'+
								'</div>'+
								'<div class="list_inner_row_bottom">'+
									'<div class="list_inner_selection list_option_container"></div>'+
								'</div>'+
							'</div>'+
						'</div>'+
					'</div>'+
				'</div>'
			),
			mafListboxOptionClone = $(
				'<div class="list_inner_item"><div class="list_inner_item_add">&nbsp;</div><div class="list_inner_item_text"></div></div>'
			),
			mafListboxNoOptionsClone = $(
				'<div class="list_inner_noitems">No Matches</div>'
			),
			mafListboxEmptyOptionsClone = $(
				'<div class="list_inner_noitems">Empty List</div>'
			),
			mafListboxOptionValueClone = $(
				'<div class="list_inner_item"><div class="list_inner_item_remove">&nbsp;</div><div class="list_inner_item_text"></div></div>'
			),
			mafTreeboxClone = $(
				'<div class="tree_container control_focusable">'+
					'<div class="tree_container_input">'+
						'<input type="text" readonly="readonly" class="mafinput tree" />'+
					'</div>'+
					'<div class="tree_container_arrows">'+
						'<div class="tree_down"><div class="tree_inner"></div></div>'+
					'</div>'+
					'<div class="tree_dropout_container">'+
						'<div class="tree_dropout">'+
							'<div class="tree_elements_container"></div>'+
						'</div>'+
					'</div>'+
				'</div>'
			),
			mafTreeGroupClone = $(
				'<div class="tree_group">'+
					'<div class="tree_group_content">'+
						'<div class="tree_group_button"></div>'+
						'<div class="tree_group_text">_</div>'+
					'</div>'+
					'<div class="tree_group_items"></div>'+
				'</div>'
			),
			mafTreeItemClone = $(
				'<div class="tree_item">'+
					'<div class="tree_item_left">'+
						'<div class="tree_item_text">_</div>'+
					'</div>'+
					'<div class="tree_item_right">'+
						'<div class="tree_item_input_container"><input class="tree_item_input" type="text" /></div>'+
					'</div>'+
				'</div>'
			);
		var newFocus = function(e){
			var oldTargets = $('.control_focusable.maf_focus');
			var newTarget = false;
			if(e)newTarget = $(e.target).closest('.control_focusable');
			if(oldTargets && (!newTarget || oldTargets.not(newTarget))){
				oldTargets.each(function(i, el){
					$(el).removeClass('maf_focus');
					$(el).closest('.setting_row.has_setting_focus').removeClass('has_setting_focus');
				});
			}
			if(e && newTarget.hasClass('mafinput_disabled')){
				e.preventDefault();
				e.stopPropagation();
			} else {
				if(newTarget){
					if(newTarget.hasClass('loosing_focus')){
						newTarget.removeClass('maf_focus loosing_focus');
						newTarget.closest('.setting_row.has_setting_focus').removeClass('has_setting_focus');								
					} else {
						newTarget.addClass('maf_focus');
						newTarget.closest('.setting_row').addClass('has_setting_focus');
					}
				}
				if(e && $(e.target).is('input[readonly="readonly"]') && $(e.target).closest('.mafinputgroup').size()>0){
					e.preventDefault();
				}
			}			
		};
		(function(){	
			// Register focus out events on body
			$('body').mousedown(newFocus);
			// Setup clone events
			mafCheckBoxClone.mousedown(function(e){
				e.preventDefault();
				if(!e.isTrigger && (e.which != 1 || $(this).hasClass('disabled')))return;
				$(this).toggleClass('checked');
				$(this).trigger('change');
			});
			mafTextboxClone.find('.mafinput.text')
				.keyup(function(){
					$(this).trigger('change');
				})
				.change(function(){
					var data = $(this).closest('.text_container').data('inputData');
					if(data.displayvalue != $(this).val()){
						data.value = data.displayvalue = $(this).val();
						$(this).trigger('maf_change');
					}
				})
			mafPasswordboxClone.find('.mafinput.password')
				.keyup(function(){
					$(this).trigger('change');
				})
				.change(function(){
					var data = $(this).closest('.password_container').data('inputData');
					if(data.displayvalue != $(this).val()){
						data.value = data.displayvalue = $(this).val();
						$(this).trigger('maf_change');
					}
				})
			mafNumberboxClone.find('.number_container_arrows .number_up')
				.click(function(e){
					var container = $(this).closest('.number_container');
					if(container.hasClass('mafinput_disabled'))return;
					var input = container.find('.mafinput.number');
					input.val((parseInt(input.val()) || 0)+1);
					input.trigger('change');
				});
			mafNumberboxClone.find('.number_container_arrows .number_down')
				.click(function(e){
					var container = $(this).closest('.number_container');
					if(container.hasClass('mafinput_disabled'))return;
					var input = container.find('.mafinput.number');
					input.val((parseInt(input.val()) || 0)-1);
					input.trigger('change');
				});
			mafNumberboxClone.find('.mafinput.number')
				.keyup(function(){
					$(this).trigger('change');								
				})
				.change(function(){
					var data = $(this).closest('.number_container').data('inputData');
					if(data.displayvalue != $(this).val()){
						data.value = data.displayvalue = $(this).val();
						$(this).trigger('maf_change');
					}
				});
			mafDropdownboxClone.find('.dropdown_dropout_container')
				.mousedown(function(e){
					if($(e.target).is('.dropdown_dropout_item') && typeof $(e.target).data('optionvalue') != 'undefined'){						
						$(this).find('.selected').removeClass('selected');
						$(e.target).addClass('selected');
						$(e.target).closest('.dropdown_container').find('.dropdown')
							.val($(e.target).data('optiondisplay'))
							.data('actual_value', $(e.target).data('optionvalue'))
							.trigger('change');
						$(this).parent('.control_focusable').addClass('loosing_focus');
						e.preventDefault();
					}
				});
			mafDropdownboxClone.find('.mafinput.dropdown')
				.keyup(function(){
					$(this).trigger('change');
				})
				.change(function(){
					var data = $(this).closest('.dropdown_container').data('inputData');
					if(data.value != $(this).data('actual_value')){
						data.value = $(this).data('actual_value');
						data.displayvalue = $(this).val();
						$(this).trigger('maf_change');
					}
				});
			mafDropdownsearchboxClone.find('.mafinput.dropdownsearch')
				.keyup(function(){
					var $this = $(this), data = $this.closest('.dropdownsearch_container').data('inputData');
					if(data.keyup_timeout){
						clearTimeout(data.keyup_timeout);
						data.keyup_timeout = false;
					}
					data.keyup_timeout = setTimeout(function(){
						data.keyup_timeout = false;
						if(data.searchchange){
							data.searchchange.call($this, $this.val());
						}
					}, searchKeyUpTimeout);
					$this.data('actual_value', $(this).val());
					$this.trigger('change');
				})
				.change(function(){
					var data = $(this).closest('.dropdownsearch_container').data('inputData');
					if(data.value != $(this).data('actual_value')){
						data.value = $(this).data('actual_value');
						data.displayvalue = $(this).val();
						$(this).trigger('maf_change');
					}
				});
			mafDropdownsearchboxClone.find('.dropdown_dropout_container')
				.mousedown(function(e){
					if($(e.target).is('.dropdown_dropout_item') && $(e.target).data('optionvalue')){
						$(e.target).closest('.dropdownsearch_container').find('.dropdownsearch')
							.val($(e.target).data('optiondisplay'))
							.data('actual_value', $(e.target).data('optionvalue'))
							.trigger('change');
						$(this).find('.selected').removeClass('selected');
						$(e.target).addClass('selected');
						$(this).parent('.control_focusable').addClass('loosing_focus');
						e.preventDefault();
					}
				});
			//***** note, IE will not give list_dropout_container focus, when clicking on a child element, try IE10, maybe even pull support? http://jsfiddle.net/bxSUp/1/
			// so need to work out a way to get working for IE elgantly
			// yucky ie fix: use event captur phase + onfocusin == http://www.quirksmode.org/blog/archives/2008/04/delegating_the.html
			mafListboxClone.find('.list_dropout')
				.mousedown(function(e){
					if($(e.target).is('.list_inner_item_add, .list_inner_item_remove')){
						var $this = $(this),container = $this.closest('.list_container'), data = container.data('inputData');
						var parentRow = $(e.target).closest('.list_inner_item');
						var updateUI = function(){
							data.value = data.raw.map(function(base){return base.value;}).join(',');
							data.displayvalue = data.raw.map(function(base){return base.display;}).join(',');
							container.find('.mafinput.list').val(data.displayvalue);
							container.find('.list_inner_value').val(data.displayvalue);
							container.find('.list_inner_count').html('('+data.raw.length+')');
							if(data.raw.length==0){
								container.find('.list_optionvalues_container').append(mafListboxEmptyOptionsClone.clone(true));
							} else {
								container.find('.list_optionvalues_container .list_inner_noitems').remove();
							}
							container.find('.mafinput.list').trigger('maf_change');
						}
						if($(e.target).is('.list_inner_item_add')){
							var addition = mafListboxOptionValueClone.clone(true);
							addition.data('optionvalue', parentRow.data('optionvalue'));
							addition.data('optiondisplay', parentRow.data('optiondisplay'));
							addition.find('.list_inner_item_text').append(parentRow.data('optiondisplay'));
							$(this).find('.list_optionvalues_container').prepend(addition);	
							data.raw.unshift({'value':parentRow.data('optionvalue'),'display':parentRow.data('optiondisplay')});
							updateUI();
						}
						if($(e.target).is('.list_inner_item_remove')){
							$(this).find('.list_optionvalues_container').children('.list_inner_item').filter(function(i, base){
								if(parentRow.is($(base))){
									setTimeout(function(){
										parentRow.remove();
										data.raw.splice(i, 1);
										updateUI();
									},1);
								}
							});
						}
					}
				});	
			mafListboxClone.find('.list_inner_search')
				.keyup(function(e){
					var $this = $(this), data = $this.closest('.list_container').data('inputData');
					if(data.keyup_timeout){
						clearTimeout(data.keyup_timeout);
						data.keyup_timeout = false;
					}
					data.keyup_timeout = setTimeout(function(){
						data.keyup_timeout = false;
						if(data.searchchange){
							data.searchchange.call($this, $this.val());
						}
					}, searchKeyUpTimeout);
				});
			mafTreeboxClone.find('.tree_elements_container')
				.mousedown(function(e){
					if($(e.target).is('.tree_group_button')){
						if($(e.target).hasClass('open')){
							$(e.target).removeClass('open');
							$(e.target).closest('.tree_group').children('.tree_group_items').removeClass('open');
						} else {
							$(e.target).addClass('open');
							$(e.target).closest('.tree_group').children('.tree_group_items').addClass('open');
						}
					}
				})
				.keyup(function(e){
					if($(e.target).is('.tree_item_input')){
						var $this = $(this), data = $this.closest('.tree_container').data('inputData');
						if(data.keyup_timeout){
							clearTimeout(data.keyup_timeout);
							data.keyup_timeout = false;
						}
						data.keyup_timeout = setTimeout(function(){
							data.keyup_timeout = false;
							if(data.objectchange){
								data.objectchange.call($this, $this.val());
							}
						}, objectKeyUpUpdateTimeout);
					}
				});
		})();
		
		
		// Callback after animation complete (100ms)
		var callbackTimer = function(f){if(f){setTimeout(f,100);}}
		// Mafia Alert box
		var MafAlert = function(obj){
			if(typeof obj != 'object'){
				obj = {
					'title':arguments[0] || false,
					'body':arguments[1] || false,
					'callback':arguments[2] || false
				};
			}
			var container = mafDialogContainerClone.clone();
			var okbutton = mafDialogOkButtonClone.clone();
			container.find('.dialog').addClass('alert');
			container.find('.dialog').prepend('<div class="head"></div>');
			container.find('.dialog').append('<div class="foot"></div>');
			container.find('.body').append(obj.body || "");
			container.find('.head').append(obj.title||obj.title==""?obj.title:"Alert");
			container.find('.foot').append(okbutton);
			container.removeClass('hidden');
			container.find('.dialog').removeClass('hidden').addClass('bounceIn');
			$('body').append(container);
			okbutton.focus();
			container.find('form').submit(function(e)
			{
				e.preventDefault();
				container.find('.dialog').addClass('bounceOut');
				setTimeout(function(){
					container.addClass('hidden');
					container.find('.dialog').addClass('hidden');
					okbutton.die();
					container.remove();
					callbackTimer(obj.callback || function(){});
				},1000);
			});
		}
		// Mafia Confirm box
		var MafConfirm = function(obj){
			if(typeof obj != 'object'){
				obj = {
					'title':arguments[0] || false,
					'body':arguments[1] || false,
					'callback':arguments[2] || false
				};
			}
			var container = mafDialogContainerClone.clone();
			var okbutton = mafDialogOkButtonClone.clone();
			var cancelbutton = mafDialogCancelButtonClone.clone();
			
			container.find('.dialog').addClass('alert');
			container.find('.dialog').prepend('<div class="head"></div>');
			container.find('.dialog').append('<div class="foot"></div>');
			container.find('.body').append(obj.body || "");
			container.find('.head').append(obj.title||obj.title==""?obj.title:"Alert");
			container.find('.foot').append(cancelbutton, okbutton);
			container.removeClass('hidden');
			container.find('.dialog').removeClass('hidden').addClass('bounceIn');
			$('body').append(container);
			okbutton.focus();
			var complete = function(e)
			{
				e.preventDefault();
				container.find('.dialog').addClass('bounceOut');
				setTimeout(function(){
					container.addClass('hidden');
					container.find('.dialog').addClass('hidden');
					okbutton.die();
					container.remove();
					callbackTimer(function(){
						if(obj.callback)obj.callback.call({}, !$(e.target).hasClass('maf_cancel'))
					});
				},1000);
			}
			cancelbutton.click(complete);
			okbutton.click(complete);
			container.find('form').submit(complete);
		}
		// Mafia Prompt box
		var MafPrompt = function(obj){
			if(typeof obj != 'object'){
				obj = {
					'title':arguments[0] || false,
					'body':arguments[1] || false,
					'placeholder':arguments[2] || false,
					'value': arguments[3] || false,
					'callback':arguments[4] || false
				};
			}
			var container = mafDialogContainerClone.clone();
			var okbutton = mafDialogOkButtonClone.clone();
			var promptInput = mafDialogInputClone.clone();
			
			promptInput
				.val(obj.value || '')
				.attr('placeholder', obj.placeholder || '');
			
			container.find('.dialog').addClass('alert');
			container.find('.dialog').prepend('<div class="head"></div>');
			container.find('.dialog').append('<div class="foot"></div>');
			container.find('.foot').append('<form type="post"></form>');
			container.find('.body')
				.addClass('center_align')
				.append(obj.body || "", "<br /><br />", promptInput);
			container.find('.head').append(obj.title||obj.title==""?obj.title:"Alert");
			container.find('.foot').append(okbutton);
			container.removeClass('hidden');
			container.find('.dialog').removeClass('hidden').addClass('bounceIn');
			$('body').append(container);
			okbutton.focus();
			var complete = function(e)
			{
				e.preventDefault();
				container.find('.dialog').addClass('bounceOut');
				setTimeout(function(){
					container.addClass('hidden');
					container.find('.dialog').addClass('hidden');
					okbutton.die();
					container.remove();
					callbackTimer(function(){
						if(obj.callback)obj.callback.call({}, promptInput.val())
					});
				},1000);
			}
			container.find('form').submit(complete);
		}
		// Mafia loading box
		var MafLoader = function(){
			var 
				_this = this,
				container=false,
				showLoading = false,
				hideNext = false;
			
			var constructor = function()
			{
				container = mafDialogContainerClone.clone();
				container.find('.dialog').addClass('loader');
				container.find('form').submit(function(e){e.preventDefault();})
				$('body').append(container);
			}
			
			this.show = function(){
				showLoading = true;
				$('body').append(container);
				container.find('.dialog').addClass('hidden').removeClass('bounceOut bounceIn');
				container.removeClass('hidden');
				container.find('.dialog').addClass('bounceIn').removeClass('hidden');
				setTimeout(function(){
					showLoading = false;
					if(hideNext){
						_this.hide(hideNext);
						hideNext = false;
					}
				},1000);
				return this;
			};
			this.hide = function(callback, force){
				callback = callback || function(){};
				if(force){
					container.addClass('hidden');
					container.find('.dialog').addClass('hidden');
					container.detach();
					callback.call();
				} else if(showLoading){
					hideNext=callback;
				} else {
					container.find('.dialog').addClass('bounceOut');
					setTimeout(function(){
						container.addClass('hidden');
						container.find('.dialog').addClass('hidden');
						container.detach();
						callbackTimer(callback);
					},1000);
				}
				return false;
			};
			this.dispose = function(){
				okbutton.die();
				container.remove();
			}
			
			constructor.apply(this, arguments);
		}
		// Single unit of submission
		var MafInputForm = function(){
			var
				groups = [];
			
			this.mafType = "MafInputForm";
				
			var constructor = function(setup){
				setup.groups.forEach(function(groupSetup){
					groups.push(new MafInputGroup(groupSetup));
				});
			}
			
			// Values
			this.getCombinedValues = function(onlyModified, groupid){
				var groupvals = {};
				var tgroups = groupid ? groups.filter(function(g){return g.getId() == groupid;}) : groups;
				tgroups = onlyModified ? tgroups.filter(function(g){return g.isModified();}) : tgroups;					
				tgroups.forEach(function(group){
					$.extend(groupvals, group.getCombinedValues( !!onlyModified ));
				});
				return groupvals;
			}
			this.setCombinedValues = function(valueidhash, groupid){
				(groupid?groups.filter(function(g){return g.getId() == groupid;}):groups)
					.forEach(function(group){
						group.setCombinedValues(valueidhash);
					});
			}
			this.isModified = function(groupid){
				return (groupid ? groups.filter(function(g){return g.getId() == groupid;}) : groups).some(function(g){return g.isModified();});
			}
			
			// Disabled
			this.getDisabled = function(groupid){
				return
					(groupid ? groups.filter(function(g){return g.getId() == groupid;}) : groups)
					.every(function(g){return g.getDisabled();});
			}
			this.setDisabled = function(disable, groupid){
				(groupid ? groups.filter(function(g){return g.getId() == groupid;}) : groups)
					.forEach(function(g){
						g.setDisabled( !!disable );
					});
			}
			this.toggleDisabled = function(groupid){
				(groupid ? groups.filter(function(g){return g.getId() == groupid;}) : groups)
					.forEach(function(g){
						g.toggleDisabled();
					});
			}
			this.get = function(tid){
				var groupsFound = groups.filter(function(g){return g.getId() == tid;});
				if(groupsFound.length > 0){
					return groupsFound[0];
				}
				var firstMatch = null;
				groups.forEach(function(g){
					var found = g.get(tid);
					if(found)firstMatch = found;
				});
				return firstMatch;
			}
			this.cleanup = function(){
				groups.forEach(function(group){
					group.cleanup();
				});
				groups = null;
			}
			
			constructor.apply(this, arguments);
		}
		// Visually break into groups
		var MafInputGroup = function(){
			var 
				groupElement,
				inputs = [],
				inputContainers = [],
				id;
			
			this.mafType = "MafInputGroup";
				
			var constructor = function(setup){
				id = setup.id;
				groupElement = mafGroupClone.clone(true);
				setup.container.append(groupElement);
				if(setup.inputs){
					var rowElement;
					setup.inputs.forEach(function(inputSetup){
						rowElement = mafRowClone.clone(true);
						inputContainers.push(rowElement);
						inputSetup.container = rowElement.find('.right_col .inner');
						inputs.push(new MafInput(inputSetup));
						rowElement.find('.left_col .inner').html(inputSetup.display);
						groupElement.append(rowElement);
					});
				}
			}
			
			this.getId = function(){
				return id;
			}
			
			// Values
			this.getCombinedValues = function(onlyModified){
				var values = {};
				(onlyModified?inputs.filter(function(inpt){return inpt.isModified();}):inputs)
					.forEach(function(input){
						values[ input.getId() ] = input.getValue();									
					});
				return values;
			}
			this.setCombinedValues = function(valueidhash){
				inputs
					.filter(function(inpt){return typeof valueidhash[inpt.getId()] != 'undefined';})
					.forEach(function(inpt){
						inpt.setValue(valueidhash[inpt.getId()]);
					});
			}
			this.isModified = function(){
				return inputs.some(function(inpt){return inpt.isModified();});
			}
			
			// Disabled
			this.getDisabled = function(){
				return inputs.some(function(inpt){return inpt.isModified();});
			}
			this.setDisabled = function(disabled){
				inputs.forEach(function(inpt){inpt.setDisabled(disabled);});
			}
			this.toggleDisabled = function(){
				inputs.forEach(function(inpt){inpt.toggleDisabled();});
			}
			
			this.get = function(tid){
				var inputsFound = inputs.filter(function(inpt){return inpt.getId() == tid;});
				return (inputsFound.length > 0) ? inputsFound[0] : false;
			}
			this.cleanup = function(){
				inputs.forEach(function(inpt){
					inpt.cleanup();
				});
				inputContainers.forEach(function(inputContainer){
					inputContainer.remove();
				});
				inputs = null;
				inputContainers = null;
			}
			
			constructor.apply(this, arguments);
		}
		// Inputs
		var MafInput = function(){
			var 
				self=this,
				inputData={},
				base=false,
				changeListeners=[];
			
			this.mafType = "MafInput";
				
			var constructor = function(setup){
				inputData.id = setup.id;
				inputData.type = setup.type;
				inputData.modified = false;
				inputData.value = "";
				inputData.displayvalue = "";
				inputData.raw = false;
				inputData.disabled = false;
				if(setup.onchange)changeListeners.push(setup.onchange);
				switch(inputData.type){
					default:case 'text':
						base = mafTextboxClone.clone(true);
						self.setValue( setup.value || '' );
						setup.container.append(base);
					break;
					case 'password':
						base = mafPasswordboxClone.clone(true);
						self.setValue( setup.value || '' );
						setup.container.append(base);
					break;
					case 'number':
						base = mafNumberboxClone.clone(true);
						self.setValue( setup.value || 0 );
						setup.container.append(base);
					break;
					case 'dropdown':
						inputData.searchFn = setup.searchfn || false;
						var defaultval = false;
						if(inputData.searchFn){
							base = mafDropdownsearchboxClone.clone(true);
							var searchFn = function(search){
								base.find('.dropdown_dropout').empty();
								inputData.searchFn.call(this, search, function(ar){
									if($.isArray(ar)){
										if(ar.length==0){
											var optElem = mafDropdownsearchboxNoOptionsClone.clone(true);
											base.find('.dropdown_dropout').append(optElem);
										} else {
											ar.forEach(function(option, i){
												var optElem = mafDropdownboxOptionClone.clone(true);
												optElem
													.append(option.display)
													.data('optionvalue', option.value)
													.data('optiondisplay', option.display);
												base.find('.dropdown_dropout').append(optElem);
											});
										}
									}
								});
							}
							inputData.searchchange = searchFn;
							searchFn('');
						} else {
							base = mafDropdownboxClone.clone(true);
							if(setup.options && setup.options.length!=0){
								setup.options.forEach(function(option,i){
									var optElem = mafDropdownboxOptionClone.clone(true);
									optElem
										.append(option.display)
										.data('optionvalue', option.value)
										.data('optiondisplay', option.display);
									base.find('.dropdown_dropout').append(optElem);
									if(i==0)defaultval = option.value;
								});
							}
						}
						if(typeof setup.value != 'undefined')self.setValue( setup.value );
						else if(typeof defaultval != 'undefined')self.setValue( defaultval );
						setup.container.append(base);
					break;
					case 'list':
						base = mafListboxClone.clone(true);
						inputData.raw = [];
						inputData.value = "";
						inputData.displayvalue = "";
						setup.container.append(base);
						if(setup.options && setup.options.length!=0){
							setup.options.forEach(function(option,i){
								var optElem = mafListboxOptionClone.clone(true);
								optElem
									.data('optionvalue', option.value)
									.data('optiondisplay', option.display)
									.find('.list_inner_item_text').append(option.display);
								base.find('.list_option_container').append(optElem);
							});
						}
						inputData.originalSearchFn = inputData.searchFn = setup.searchfn || false;
						inputData.originalOptions = $.extend(true, [], setup.options);
						var searchFn = false;
						if(!inputData.searchFn){
							inputData.searchFn = function(search, callback){
								search = search.toLowerCase();
								var ar = inputData.originalOptions;
								if(!!search)ar = ar.filter(function(v){return v.value.toLowerCase().indexOf(search) != -1 || v.display.toLowerCase().indexOf(search) != -1;});
								callback.call({}, ar);
							}
						}
						base.find('.list_optionvalues_container').append(mafListboxEmptyOptionsClone.clone(true));
						var searchFn = function(search){
							base.find('.list_option_container').empty();
							inputData.searchFn.call(this, search, function(ar){
								if($.isArray(ar)){
									if(ar.length==0){
										base.find('.list_option_container').append(mafListboxNoOptionsClone.clone(true));
									} else {
										ar.forEach(function(option, i){
											var optElem = mafListboxOptionClone.clone(true);
											optElem
												.data('optionvalue', option.value)
												.data('optiondisplay', option.display)
												.find('.list_inner_item_text').append(option.display);
											base.find('.list_option_container').append(optElem);
										});
									}
								}
							});
						}
						inputData.searchchange = searchFn;
						searchFn('');
						if(setup.value)self.setValue( setup.value );
					break;
					case 'tree':
						base = mafTreeboxClone.clone(true);
						inputData.value = "";
						inputData.displayvalue = "";
						var recursiveTreeSetupFn = function(item, parentContainer){
							if(item.id){
								item.value = item.value || "";
								var itemel = mafTreeItemClone.clone(true);
								itemel.find('.tree_item_text').empty().append(item.display);
								itemel.find('.tree_item_input').val(item.value || '').data('id', item.id);
								parentContainer.append(itemel);
							} else {
								var groupel = mafTreeGroupClone.clone(true);
								groupel.find('.tree_group_text').empty().append(item.display);
								groupel.find('.tree_group_items').empty();
								(item.fields || []).forEach(function(subitem){
									recursiveTreeSetupFn(subitem, groupel.find('.tree_group_items'));
								});
								parentContainer.append(groupel);
							}
						}
						if($.isArray(setup.schema)){
							inputData.originalSchema = $.extend(true, [], setup.schema);
							inputData.originalSchema.forEach(function(item){
								recursiveTreeSetupFn(item, base.find('.tree_elements_container'));
							});
						}
						var objectChangeFn = function(){
							var values = {};
							base.find('.tree_elements_container .tree_item_input')
								.each(function(i, el){
									values[$(el).data('id')] = $(el).val();
								});
							inputData.value = JSON.stringify(values);
							inputData.inputElement.trigger('maf_change');
						}
						inputData.objectchange = objectChangeFn;
						setup.container.append(base);
						base.find('.mafinput').val( 'Mixed Values' );
						self.setValue( setup.value || "" );
					break;
				}
				base.data('inputData', inputData);
				inputData.containerElement = base;
				inputData.originalvalue = inputData.value;
				inputData.inputElement = base.find('.mafinput');
				self.setDisabled( setup.disabled || false );
				if(setup.warning){
					base.closest('.setting_row').addClass('warning');
					base.closest('.setting_row').find('.warning_text_content').empty().append(setup.warning);
				}
				inputData.inputElement.bind('maf_change', function(){
					if((inputData.originalvalue != inputData.value && !inputData.modified) || (inputData.originalvalue == inputData.value && inputData.modified)){										
						inputData.modified = inputData.originalvalue != inputData.value;
						if(inputData.modified)base.closest('.setting_row').addClass('modified');
						else base.closest('.setting_row').removeClass('modified');
					}
					changeListeners.forEach(function(fn){
						fn.call({}, inputData.value, inputData.modified);
					});
				});
			}
			
			this.change = function(func){
				changeListeners.push(func);
			}
			this.getId = function(){
				return inputData.id;
			}
			
			// Values
			this.setValue = function(newVal){
				// resets isModified
				switch(inputData.type){
					default:
						inputData.displayvalue = inputData.value = newVal;
						base.find('.mafinput').val(inputData.value);
					break;
					case 'dropdown':
						if(inputData.searchFn){										
							if(typeof newVal != 'object' || typeof newVal['display'] == 'undefined' || typeof newVal['value'] == 'undefined' ){
								console.error('MInput: Attempted to give a value that does not match for searchFn dropdown {display:*,value:*} format ->', newVal);
								return;
							}
							inputData.value = newVal['value'];
							inputData.displayvalue = newVal['display'];
							base.find('.mafinput').val( inputData.displayvalue );
							inputData.searchchange(inputData.displayvalue);
							base.find('.dropdown_dropout .dropdown_dropout_item').each(function(i, el){
								if($(el).data('optionvalue') == inputData.value){
									$(el).addClass('selected');
								} else {
									$(el).removeClass('selected');
								}
							});
						} else {
							// we only set the value if the dropdown contains that item.
							if(typeof newVal == 'object' && typeof newVal['value'] != 'undefined' ){
								newVal = newVal['value'];
							}
							var found = base.find('.dropdown_dropout .dropdown_dropout_item').filter(function(i, el){
								return ($(el).data('optionvalue') == newVal);
							});
							if(found.length < 1){
								console.error('MInput: Strange value matches when setting dropdown value? ('+found.length+')', found);
								return;
							}
							found = found[0];
							if(!found){			
								console.error('MInput: Attempted to give a value that is not in the dropdown list.');
								return;								
							}
							found = $(found);
							inputData.displayvalue = found.data('optiondisplay');
							inputData.value = found.data('optionvalue');
							base.find('.mafinput').val( inputData.displayvalue );
							base.find('.dropdown_dropout .dropdown_dropout_item').removeClass('selected');
							found.addClass('selected');
						}									
					break;
					case 'list':
						if(inputData.originalSearchFn){
							if(newVal.length != 0 && (typeof newVal[0] != 'object' || typeof newVal[0]['display'] == 'undefined' || typeof newVal[0]['value'] == 'undefined' )){
								console.error('MInput: Attempted to give a value that does not match for searchFn listbox {display:*,value:*} format ->', newVal);
								return;
							}
							if(typeof newVal == "string")newVal = newVal.split(',');
						} else {
							if(newVal.length != 0 && typeof newVal[0] == 'object' && typeof newVal[0]['value'] != 'undefined' ){
								var oldVal = newVal;
								newVal = oldVal.map(function(v){return v['value'];});
							}
							if(typeof newVal == "string")newVal = newVal.split(',');
							var tempVal = [];
							newVal.forEach(function(value){
								var val = inputData.originalOptions.filter(function(vv){return vv['value'] == value;});
								if(!val || val.length != 1){
									console.warn('MInput: Missing value in listbox ->', value);
								} else {
									tempVal.push(val[0]);
								}
							});
							newVal = tempVal;										
						}
						inputData.raw = [];
						base.find('.list_optionvalues_container').empty();
						newVal.forEach(function(v){
							var addition = mafListboxOptionValueClone.clone(true);
							addition.data('optionvalue', v['value']);
							addition.data('optiondisplay', v['display']);
							addition.find('.list_inner_item_text').append(v['display']);
							base.find('.list_optionvalues_container').append(addition);	
							inputData.raw.push(v);
						});
						inputData.value = inputData.raw.map(function(base){return base.value;}).join(',');
						inputData.displayvalue = inputData.raw.map(function(base){return base.display;}).join(',');
						base.find('.mafinput.list').val(inputData.displayvalue);
						base.find('.list_inner_value').val(inputData.displayvalue);
						base.find('.list_inner_count').html('('+inputData.raw.length+')');
						if(inputData.raw.length==0){
							base.find('.list_optionvalues_container').append(mafListboxEmptyOptionsClone.clone(true));
						}
					break;
					case 'tree':
						if(typeof newVal == 'string'){
							if(!newVal)newVal = {};
							else try{
								newVal = JSON.parse(newVal);
							} catch(er){}
						}
						if(typeof newVal != 'object'){
							console.error('MInput: Attempted to set an invalid tree value (needs to be obj or JSONstring)', newVal);
							return;
						}
						inputData.value = {};
						base.find('.tree_elements_container .tree_item_input')
							.each(function(i, el){
								if(newVal[$(el).data('id')]){
									$(el).val( newVal[$(el).data('id')] );
								}
								inputData.value[$(el).data('id')] = $(el).val();
							});
							inputData.value = JSON.stringify(inputData.value);
					break;
				}
				base.closest('.setting_row').removeClass('modified');
				inputData.originalvalue = inputData.value;
				inputData.modified = false;
			}
			this.getValue = function(){
				var val = null;
				try
				{
					switch(inputData.type){
						default:
							val = inputData.value;
						break;
						case 'list':
							val = inputData.value.split(',');
						break;
						case 'tree':							
							val = JSON.parse(inputData.value);
						break;
					}
				}
				catch(er)
				{
					console.error(er);
				}
				return val;
			}
			this.isModified = function(){
				return inputData.modified;
			}
			
			// Disabled
			this.getDisabled = function(){
				return inputData.disabled;
			}
			this.setDisabled = function(disabled){
				inputData.disabled = !!disabled;
				if(inputData.disabled){
					base.addClass('mafinput_disabled');
					base.find('.mafinput')
						.prop('disabled', true)
						.attr('title', 'Input disabled');
					newFocus(false);
				} else {
					base.removeClass('mafinput_disabled');
					base.find('.mafinput')
						.prop('disabled', false)
						.attr('title', '');
				}
				base.find('.mafinput').prop('disabled', inputData.disabled);
			}
			this.toggleDisabled = function(){
				self.setDisabled( !inputData.disabled );
			}
			
			this.cleanup = function(){
				inputData.inputElement.remove();
				inputData.containerElement.remove();
				for(var key in inputData){
					delete inputData[key];
				}
				inputData = null;
				base = null;
				changeListeners = null;
			}
			
			constructor.apply(this, arguments);
		}
		// Context Menu
		var MafContextMenu = function(){
			var 
				_this = this,
				base = false,
				x = 0,
				y = 0,
				hasFocus = false;
			
			var constructor = function(setup)
			{
				base = mafContextMenuClone.clone(true);
				$('body')
					.on('mousedown', looseFocus)
					.append(base);
				_this.setup(setup);
			}
			var looseFocus = function(e)
			{
				if(!hasFocus)return;
				if(!$(e.target).closest('.mafcontext').is(base))
				{
					_this.hide();
				}
			}
			var recalculatePosition = function()
			{
				var 
					cwidth = base.find('.context_inner').outerWidth(),
					cheight = base.find('.context_inner').outerHeight(),
					wwidth = $(window).width(),
					wheight = $(window).height();
				base.find('.context_inner').css( x+cwidth>=wwidth ? {'right':'0px','left':'auto'} : {'left':'0px','right':'auto'} );
				base.find('.context_inner').css( y+cheight>=wheight ? {'bottom':'0px','top':'auto'} : {'top':'0px','bottom':'auto'} );				
			}
			
			this.setup = function(tsetup)
			{
				if(!tsetup)tsetup = {};
				if(typeof tsetup.x != 'undefined')x=parseInt(tsetup.x) || 0;
				if(typeof tsetup.y != 'undefined')y=parseInt(tsetup.y) || 0;
				base.css({'top':y+'px','left':x+'px'});
				if(typeof tsetup.options != 'undefined'){
					base.find('.context_inner').empty();
					tsetup.options.forEach(function(opt){
						var contextItem = mafContextItemClone.clone(true);
						if(opt.disabled){
							contextItem.addClass('item_disabled');
						}
						contextItem.html(opt.display);
						contextItem.click(function(){
							_this.hide();
							if(!$(this).hasClass('item_disabled') && opt.fn)opt.fn.call();
						});
						base.find('.context_inner').append(contextItem);
					});
				}
				recalculatePosition();
			}
			this.dispose = function()
			{
				base.remove();
			}
			this.show = function(setup)
			{
				if(setup)_this.setup(setup);
				base.removeClass('hidden');
				setTimeout(recalculatePosition,50);
				hasFocus = true;
			}
			this.hide = function()
			{
				base.addClass('hidden');
				hasFocus = false;
			}
			
			constructor.apply(this, arguments);
		}
		// Setup Button Down event button
		var SetupButtonDownEvent = function(jqButton){
			jqButton = $(jqButton);
			jqButton.mousedown(function(e){
				e.preventDefault();
				$(jqButton).addClass('down');
				var upFn = function(){
					$(jqButton).removeClass('down');
					$(window).off('mouseup', upFn);
				}
				$(window).on('mouseup', upFn);
			});
		}
		// Only reveal methods that should be public at this point
		return {
			createInput:function(setup){return new MafInput(setup);},
			createGroup:function(setup){return new MafInputGroup(setup);},
			createForm:function(setup){return new MafInputForm(setup);},
			createLoader:function(setup){return new MafLoader(setup);},
			createStandaloneCheckbox:function(){return base = mafCheckBoxClone.clone(true);},
			createContextMenu:function(setup){return new MafContextMenu(setup);},
			addButtonDownEvent:SetupButtonDownEvent,
			alert:MafAlert,
			confirm:MafConfirm,
			prompt:MafPrompt
		}
	}());
});