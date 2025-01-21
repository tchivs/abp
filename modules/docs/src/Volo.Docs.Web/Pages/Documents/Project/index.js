var doc = doc || {};

(function ($) {
    $(function () {        
        
        doc.lazyExpandableNavigation = {
            isAllLoaded: false,
            findNode : function(text, href, node){
                if(node.text === text && node.path === href && node.isLazyExpandable){
                    return node;
                }
                if(node.items){
                    for (let i = 0; i < node.items.length; i++) {
                        var result = doc.lazyExpandableNavigation.findNode(text, href, node.items[i]);
                        if(result){
                            return result;
                        }
                    }
                }
                return null;
            },
            renderNodeAsHtml : function($lazyLiElement, node, isRootLazyNode){
                if(node.isEmpty){
                    return;
                }

                var textCss = node.path === "javascript:;" ? "": "tree-toggle";
                var uiCss = isRootLazyNode ? "" : "style='display: none;'";
                var $ul =  $(`<ul class="nav nav-list tree" ${uiCss}></ul>`);
                var $li = $(`<li class="${node.hasChildItems ? 'nav-header' : 'last-link'}"></li>`);
                
                $li.append(`<span class="plus-icon"> <i class="fa fa-${node.hasChildItems ? 'chevron-right' : node.path === "javascript:;" ? 'has-link' : 'no-link'}"></i></span><a href="${node.path}" class="${textCss}">${node.text}</a>`)

                if(node.isLazyExpandable){
                    $li.addClass("lazy-expand");
                }else if(node.hasChildItems){
                    node.items.forEach(function(item){
                        doc.lazyExpandableNavigation.renderNodeAsHtml($li, item, false);
                    });
                }

                $ul.append($li);
                $lazyLiElement.append($ul)

                window.Toc.helpers.initNavEvent();
            },
            loadAll : function(lazyLiElements){
                if(doc.lazyExpandableNavigation.isAllLoaded){
                    return;
                }
                for(var i = 0; i < lazyLiElements.length; i++){

                    doc.lazyExpandableNavigation.load(lazyLiElements[i]);

                    var $li = $(lazyLiElements[i]);
                    var childLazyLiElements = $li.find("li.lazy-expand");
                    if(childLazyLiElements.length > 0){
                        doc.lazyExpandableNavigation.isAllLoaded = false;
                        doc.lazyExpandableNavigation.loadAll(childLazyLiElements);
                    }

                    initLazyExpandNavigation();
                }
                
                doc.lazyExpandableNavigation.isAllLoaded = true;
            },
            load : function(lazyLiEment){
                var $li = $(lazyLiEment);

                if($li.has("ul").length > 0){
                    return;
                }
                
                var $a = $li.find("a");
                var text = $a.contents().filter(function() { return this.nodeType === 3 }).text();
                var node = doc.lazyExpandableNavigation.findNode(text, $a.attr("href") , doc.project.navigation);
                if(!node || !node.items){
                    return;
                }
                node.items.forEach(item => {
                    doc.lazyExpandableNavigation.renderNodeAsHtml($li, item, true);
                })
            }
        }
        
        var initNavigationFilter = function (navigationContainerId) {
            var $navigation = $('#' + navigationContainerId);

            var $searchAllDocument = $('#search-all-document');

            var filterDocumentItems = function (filterText) {
                
                $navigation
                    .find('.mCSB_container .opened')
                    .removeClass('opened');
                $navigation
                    .find('.mCSB_container > li, .mCSB_container > li ul')
                    .hide();

                if (!filterText) {
                    $navigation.find('.mCSB_container > li').show();
                    $navigation
                        .find('.mCSB_container .selected-tree > ul')
                        .show();
                    $searchAllDocument.hide();
                    return;
                }

                doc.lazyExpandableNavigation.loadAll($navigation.find("li.lazy-expand"));
                
                var filteredItems = $navigation
                    .find('li > a')
                    .filter(function () {
                        return (
                            $(this)
                                .text()
                                .toUpperCase()
                                .indexOf(filterText.toUpperCase()) > -1
                        );
                    });

                filteredItems.each(function () {
                    var $el = $(this);
                    $el.show();
                    var $parent = $el.parent();

                    var hasParent = true;
                    while (hasParent) {
                        if ($parent.attr('id') === navigationContainerId) {
                            break;
                        }

                        $parent.show();
                        $parent
                            .find('> li > label')
                            .not('.last-link')
                            .addClass('opened');

                        $parent = $parent.parent();
                        hasParent = $parent.length > 0;
                    }
                });
                
                $searchAllDocument.show();
            };

            $searchAllDocument.click(function () {
                fullSearch($('#filter').val());
            });

            $('#filter').on('input', (e) => {
                filterDocumentItems(e.target.value);
            })

            $('#filter').keyup(function (e) {
                if (e.key === 'Enter') {
                    fullSearch($('#filter').val());
                }
            });
            
            function fullSearch(filterText){
                var url = $('#fullsearch').data('fullsearch-url');
                if(url){
                    window.open(url + "?keyword=" + encodeURIComponent(filterText));
                }
            }

            $('#fullsearch').keyup(function (e) {
                if (e.key === 'Enter') {
                    fullSearch(e.target.value);
                }
            });
        };  

        var initAnchorTags = function (container) {
            anchors.options = {
                placement: 'left',
            };

            var anchorTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
            anchorTags.forEach(function (tag) {
                anchors.add(container + ' ' + tag);
            });
        };

        var initDocProject = function(){
            abp.ajax({
                type :"GET",
                url: '/docs/document-navigation',
                data: {
                    projectId: doc.project.id,
                    version: doc.project.version,
                    routeVersion: doc.project.routeVersion,
                    languageCode: doc.project.languageCode,
                    projectName: doc.project.name,
                    projectFormat: doc.project.format
                }
            }).done(data => {
                doc.project.navigation = data;
            })
        }

        var initSocialShareLinks = function () {
            var pageHeader = $('.docs-body').find('h1, h2').first().text();

            var projectName = $('#ProjectName')[0].innerText;

            $('#TwitterShareLink').attr(
                'href',
                'https://twitter.com/intent/tweet?text=' +
                encodeURI(
                    pageHeader +
                    ' | ' +
                    projectName +
                    ' | ' +
                    window.location.href
                )
            );

            $('#LinkedinShareLink').attr(
                'href',
                'https://www.linkedin.com/shareArticle?' +
                'url=' +
                encodeURI(window.location.href) +
                '&' +
                'mini=true&' +
                'summary=' +
                encodeURI(projectName) +
                '&' +
                'title=' +
                encodeURI(pageHeader) +
                '&' +
                'source=' +
                encodeURI($('#GoToMainWebSite').attr('href'))
            );

            $('#EmailShareLink').attr(
                'href',
                'mailto:?' +
                'body=' +
                encodeURI('I want you to look at ' + window.location.href) +
                '&' +
                'subject=' +
                encodeURI(pageHeader + ' | ' + projectName) +
                '&'
            );
        };

        var initSections = function () {
            var clearQueryString = function () {
                var uri = window.location.href.toString();

                if (uri.indexOf('?') > 0) {
                    uri = uri.substring(0, uri.indexOf('?'));
                }

                window.history.replaceState({}, document.title, uri);
            };

            var setQueryString = function () {
                var comboboxes = $('.doc-section-combobox');
                if (comboboxes.length < 1) {
                    return;
                }

                var hash = document.location.hash;

                clearQueryString();

                var uri = window.location.href.toString();

                var new_uri = uri + '?';

                for (var i = 0; i < comboboxes.length; i++) {
                    var key = $(comboboxes[i]).data('key');
                    var value = comboboxes[i].value;

                    new_uri += key + '=' + value;

                    if (i !== comboboxes.length - 1) {
                        new_uri += '&';
                    }
                }

                window.history.replaceState({}, document.title, new_uri + hash);
            };

            var getTenYearsLater = function () {
                var tenYearsLater = new Date();
                tenYearsLater.setTime(
                    tenYearsLater.getTime() + 365 * 10 * 24 * 60 * 60 * 1000
                );
                return tenYearsLater;
            };

            var setCookies = function () {
                var cookie = abp.utils.getCookieValue('AbpDocsPreferences');

                if (!cookie || cookie == null || cookie === null) {
                    cookie = '';
                }
                var keyValues = cookie.split('|');

                var comboboxes = $('.doc-section-combobox');

                for (var i = 0; i < comboboxes.length; i++) {
                    var key = $(comboboxes[i]).data('key');
                    var value = comboboxes[i].value;

                    var changed = false;
                    var keyValueslength = keyValues.length;
                    for (var k = 0; k < keyValueslength; k++) {
                        var splitted = keyValues[k].split('=');

                        if (splitted.length > 0 && splitted[0] === key) {
                            keyValues[k] = key + '=' + value;
                            changed = true;
                        }
                    }

                    if (!changed) {
                        keyValues.push(key + '=' + value);
                    }
                }

                abp.utils.setCookieValue(
                    'AbpDocsPreferences',
                    keyValues.join('|'),
                    getTenYearsLater(),
                    '/'
                );
            };

            var initCookies = function () {
                var cookie = abp.utils.getCookieValue('AbpDocsPreferences');

                if (!cookie || cookie == null || cookie === null) {
                    setCookies();
                } else {
                    var uri = window.location.href.toString();

                    if (uri.indexOf('?') > 0) {
                        setCookies();
                    }
                }
            };

            $('.doc-section-combobox').change(function () {
                setCookies();
                clearQueryString();
                location.reload();
            });

            initCookies();
            setQueryString();
        };

        var initDocumentNodeBreadcrumb = function (){
            var selectedTreeRoot = $("li.nav-header.selected-tree")[0];
            if(selectedTreeRoot)
            {
                var $selectedTreeRoot = $(selectedTreeRoot);
                var firstAnchor = $selectedTreeRoot.find("a");

                var documentNodeNames = $("#document-node-wrapper");
                documentNodeNames.append('<li class="breadcrumb-item"><a href="' + firstAnchor.attr("href") + '">' + firstAnchor.html() + '</a></li>');

                var selectedTreeItems = $selectedTreeRoot.find("ul.nav-list > li.selected-tree");
                for (let i = 0; i < selectedTreeItems.length; i++)
                {
                    var anchorItem = $(selectedTreeItems[i]).find("a");
                    documentNodeNames.append('<li class="breadcrumb-item ' + (i === selectedTreeItems.length - 1 ? "active": "") + '"><a href="' + anchorItem.attr("href") + '">' + anchorItem.html() + '</a></li>');
                }
            }
        };
        
        var initLazyExpandNavigation = function(){
            $("li .lazy-expand").off('click');
            $("li .lazy-expand a").on('click', function(e){
                if($(this).attr("href") !== "javascript:;"){
                    e.stopPropagation();
                }
            });
            $("li .lazy-expand").on('click', function(){
                doc.lazyExpandableNavigation.load(this);
                initLazyExpandNavigation();
            });
        }

        initDocProject();
        
        initNavigationFilter('sidebar-scroll');

        initAnchorTags('.docs-page .docs-body');

        initSocialShareLinks();

        initSections();

        initLazyExpandNavigation();
        
        Element.prototype.querySelector = function (selector) {
            var result = $(this).find(decodeURI(selector));
            if(result.length > 0){
                return result[0];
            }
            return null;
        };
        
        var originalSet = Map.prototype.set;
        Map.prototype.set = function (key, value) {
            if(typeof key === 'string'){
                key = decodeURI(key);
            }
            return originalSet.call(this, key, value);
        };
        
    });
})(jQuery);
