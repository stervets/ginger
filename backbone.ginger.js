/**
 * Ginger BackboneJS
 * Backbone.View initialization plugin
 * Version : 0.1
 * Author: Mickey Spektor
 * www.facebook.com/mickey.spektor
 * Date: 21.04.13
 */

/**
 * Ginger options
 */
Backbone.Ginger = {
    options: {
        // Title for console output
        title: '[BackboneJS Ginger]: ',
        // Template variable name. Must be string, which will be compiled by Handlebars.compile()
        templateVariable: 'template',
        // Custom node variable for jQuery selector or Handlebars compiled template
        nodeVariable: 'node',
        // Collection variable, which contains all collections defined by collectionHandler
        collectionVariable: 'collection',
        // Variable, which contains all collections view nodes
        collectionViewNodeVariable: 'collectionViewNode',
        // Variable name, which contains link to view from model or collection
        viewVariable: 'view',
        // User init function, fired after Backbone.View.initialize
        initFunction : 'init',

        // model parent object, where Ginger will try to find modelImportVariable
        modelImportParentObject: window,
        // model variable name (# - will be substituted by collectionHandler key)
        modelImportVariable: '#',
        // model handler hash (modelHandler : { all : function(){} } ) - fired on all model events
        modelHandler: 'modelHandler',

        // collection parent object, where Ginger will try to find collectionImportVariable
        collectionImportParentObject: window,
        // model variable name (# - will be substituted by collectionHandler key)
        // If undefined - collection will be created
        collectionImportVariable: '#Collection',
        // model handler hash (collectionHandler : { collection1 : {all : function(){}} } ) - fired on all collection1 events
        collectionHandler: 'collectionHandler',
        // HTML-element id of collection node. (# - will be substituted by viewVariable key)
        collectionViewNode: 'js#',

        // collection parent object, where Ginger will try to find viewVariable
        viewImportParentObject: window,
        // view variable name (# - will be substituted by collectionHandler key)
        viewImportVariable: '#View'
    },

    error: function (text) {
        throw new Error(Backbone.Ginger.options.title + text);
    },

    substitute: function (option, name) {
        if (Backbone.Ginger.options[option] == undefined) {
            Backbone.Ginger.error('Option "' + option + '" is undefined');
        }
        return Backbone.Ginger.options[option] == '#' ? name : Backbone.Ginger.options[option].replace('#', name);
    }
};

Backbone.View.prototype.initialize = function (options) {
    //Setup node ($el)
    if (this[Backbone.Ginger.options.nodeVariable] != undefined||this[Backbone.Ginger.options.templateVariable] != undefined) {
        if (this[Backbone.Ginger.options.templateVariable] == undefined) {
            if (_(this[Backbone.Ginger.options.nodeVariable]).isString()) {
                if (!(this.$el = $(this[Backbone.Ginger.options.nodeVariable])).length) {
                    Backbone.Ginger.error('Element $("' + this[Backbone.Ginger.options.nodeVariable] + '") not found');
                }
            }
        } else {
            this[Backbone.Ginger.options.nodeVariable] = Handlebars.compile(this[Backbone.Ginger.options.templateVariable]);
        }

        if (_(this[Backbone.Ginger.options.nodeVariable]).isFunction()) {
            if (this.model == undefined) {
                Backbone.Ginger.error('Backbone.View.model is undefined');
            } else {
                this.$el = $(this[Backbone.Ginger.options.nodeVariable](this.model.toJSON()));
            }
        } else {
            if (!_(this[Backbone.Ginger.options.nodeVariable]).isString()) {
                Backbone.Ginger.error('Backbone.View.node must be a string (jQuery selector) or Handlebars compiled function');
            }
        }
    }

    //Setup collection handler
    if (_(this[Backbone.Ginger.options.collectionHandler]).isObject()) {
        if (Backbone.Ginger.options.collectionImportParentObject == undefined) {
            Backbone.Ginger.error('Collection parent object (Backbone.Ginger.options.collectionImportParentObject) is undefined');
        }

        this[Backbone.Ginger.options.collectionVariable] = {};
        this[Backbone.Ginger.options.collectionViewNodeVariable] = {};

        _(this[Backbone.Ginger.options.collectionHandler]).each(function (events, modelName) {
            modelName = Backbone.Ginger.substitute('modelImportVariable', modelName);

            if (Backbone.Ginger.options.modelImportParentObject[modelName] == undefined) {
                Backbone.Ginger.error('Collection handler model "' + modelName + '" is undefined');
            } else {
                //Default collection
                var collectionImportVariable = Backbone.Ginger.substitute('collectionImportVariable', modelName);
                var collectionObject = Backbone.Ginger.options.collectionImportParentObject[collectionImportVariable];

                if (collectionObject == undefined) {
                    Backbone.Ginger.options.collectionImportParentObject[collectionImportVariable] = Backbone.Collection.extend({
                        model: Backbone.Ginger.options.modelImportParentObject[modelName]
                    });
                }else{
                    if (!(collectionObject.prototype.model.prototype instanceof Backbone.Model)){
                        collectionObject.prototype.model = Backbone.Ginger.options.modelImportParentObject[modelName]
                    }
                }

                this[Backbone.Ginger.options.collectionVariable][modelName] = new Backbone.Ginger.options.collectionImportParentObject[collectionImportVariable]();
                this[Backbone.Ginger.options.collectionVariable][modelName][Backbone.Ginger.options.viewVariable] = this;
            }

            if (_(events).isObject()) {
                var modelViewName = Backbone.Ginger.substitute('viewImportVariable', modelName);
                var collectionViewNode = Backbone.Ginger.substitute('collectionViewNode', modelViewName);
                var modelViewNode = this.$('#' + collectionViewNode);

                if (!modelViewNode.length) {
                    Backbone.Ginger.error('Collection model "' + modelName + '" view $("' + collectionViewNode + '") not found in the $("' + this[Backbone.Ginger.options.nodeVariable] + '")');
                }

                this[Backbone.Ginger.options.collectionViewNodeVariable][modelName] = modelViewNode;

                if (!_(events.add).isFunction()) {
                    events.add = function (aModel) {
                        if (Backbone.Ginger.options.viewImportParentObject[modelViewName] == undefined) {
                            Backbone.Ginger.error('Model "' + modelName + '" view object "' + modelViewName + '" is missing');
                        } else {
                            aModel[Backbone.Ginger.options.viewVariable] = new Backbone.Ginger.options.viewImportParentObject[modelViewName]({
                                model: aModel
                            });
                        }
                        modelViewNode.append(aModel.view.$el);
                    }
                }

                if (!_(events.reset).isFunction()) {
                    events.reset = function (aCollection) {
                        modelViewNode.empty();
                        aCollection.each(function (aModel) {
                            this[Backbone.Ginger.options.collectionHandler][modelName].add(aModel);
                        }, this);
                    }
                }

                _(events).each(function (handler, event) {
                    if (_(handler).isFunction()) {
                        this[Backbone.Ginger.options.collectionVariable][modelName].on(event, handler, this);
                    } else {
                        Backbone.Ginger.error('"' + modelName + '" collection handler for "' + event + '" must be a function');
                    }
                }, this);
            } else {
                Backbone.Ginger.error('Collection handler "' + Backbone.Ginger.options.collectionHandler + '" must be a hash');
            }
        }, this);
    }

    // Setup model handler
    if (_(this[Backbone.Ginger.options.modelHandler]).isObject()) {
        if (this.model == undefined) {
            Backbone.Ginger.error('ModelHandler has found, but model is undefined');
        }

        if (!_(this[Backbone.Ginger.options.nodeVariable]).isObject()) {
            Backbone.Ginger.error('ModelHandler has found. "' + this[Backbone.Ginger.options.nodeVariable] + '" must be a compiled Handlebars template');
        }

        if (_(this.model.validate).isFunction()) {
            this.model.validate();
        }

        this.$el = $(this[Backbone.Ginger.options.nodeVariable](this.model.toJSON()));

        if (!_(this[Backbone.Ginger.options.modelHandler].change).isFunction()) {
            this[Backbone.Ginger.options.modelHandler].change = function () {
                var view = this;
                view.$el.html($(this[Backbone.Ginger.options.nodeVariable](view.model.toJSON())).html());
                return view;
            }
        }

        if (!_(this[Backbone.Ginger.options.modelHandler].destroy).isFunction()) {
            this[Backbone.Ginger.options.modelHandler].destroy = function () {
                this.remove();
            }
        }

        _(this[Backbone.Ginger.options.modelHandler]).each(function (handler, event) {
            if (_(handler).isFunction()) {
                this.model.on(event, handler, this);
            } else {
                Backbone.Ginger.error('Model handler for "' + event + '" must be a function');
            }
        }, this);

    }

    if (_(this[Backbone.Ginger.options.initFunction]).isFunction()) {
        this[Backbone.Ginger.options.initFunction](options);
    }
};