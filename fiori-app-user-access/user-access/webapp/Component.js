sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"com/9b/useracc/model/models",
	"sap/f/FlexibleColumnLayoutSemanticHelper",
	"sap/ui/model/json/JSONModel"
], function (UIComponent, Device, models, FlexibleColumnLayoutSemanticHelper, JSONModel) {
	"use strict";

	return UIComponent.extend("com.9b.useracc.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {

			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			var appModel = new JSONModel({
				busy: true,
				delay: 0,
				layout: "OneColumn",
				previousLayout: "",
				actionButtonsInfo: {
					midColumn: {
						fullScreen: false
					}
				},
				strainList: []
			});
			appModel.setSizeLimit(1000);
			this.setModel(appModel, "appModel");

			//set the odata service call model
			var jsonModel = new JSONModel({
				strainList: [],
				createMode: false,
				serLayerbaseUrl: "https://ghdev.seedandbeyond.com:50000",
				userAuthPayload: {
					"CompanyDB": "QAS",
					"UserName": "aag11163",
					"Password": "#!GLaSs@HoUsE!#9174!#"
				},
				
				//set the app navigation URL model
				serviceLayerbaseUrl: "https://demo.seedandbeyond.com/webx/index.html#",
				target: {
					Strain: "webclient-ext-strainlist-app-content-sapb1strainlist",
					ClonePlanner: "webclient-ext-clone-planner-app-content-sapb1cloneplanner",
					VegPlanner: "webclient-ext-veg-planner-app-content-sapb1vegplanner",
					FlowerPlanner: "webclient-ext-flowering-app-content-sapb1flowering",
					Harvest: "webclient-ext-harvest-planner-app-content-sapb1harvest-planner",
					MotherPlanner: "webclient-ext-motherplanner-app-content-sapb1motherplanner",
					DestroyedPlants: "webclient-ext-destroy-plant-app-content-sapb1destroy-plant",
					Waste: "webclient-ext-waste-record-app-content-sapb1waste-record",
					ManagePackages: "webclient-ext-manage-packages-app-content-sapb1manage-packages",
					METRCTag: "webclient-ext-metrc-tag-app-content-sapb1metrctag",
					ReceiveProducts: "webclient-ext-receive-products-app-content-sapb1receive-products"
				}
			});
			jsonModel.setSizeLimit(10000);
			this.setModel(jsonModel, "jsonModel");

			// update browser title
			this.getRouter().attachTitleChanged(function (oEvent) {
				var sTitle = oEvent.getParameter("title");
				document.addEventListener('DOMContentLoaded', function () {
					document.title = sTitle;
				});
			});

		//	this.addChangeLog();

		},

		//session timeout by susmita
		getSessionTimeOut: function () {
			var fiveMinutesLater = new Date();
			var scs = fiveMinutesLater.setMinutes(fiveMinutesLater.getMinutes() + 1);
			var countdowntime = scs;
			var that = this;
			var x = setInterval(function () {
				var now = new Date().getTime();
				var cTime = countdowntime - now;
				if (cTime < 0) {
					that._getDialog().open();
					clearInterval(x);
				}
			});
		},
		onClose: function () {
			this._getDialog().close();
			//this.getSessionTimeOut();
			clearInterval();
		},
		onSubmit: function () {
			this.getRouter().navTo("dashBoard");
			this._getDialog().close();
			//this.getSessionTimeOut();
			clearInterval();
		},
		_getDialog: function () {
			if (!this.dialog) {
				//this.dialog = sap.ui.xmlfragment("login.view.otp", this);
				this.dialog = sap.ui.xmlfragment("sessionDialog", "com.9b.useracc.view.fragments.SessionTimeoutDialog", this);
			}
			return this.dialog;
		},

		getHelper: function (oFCL) {
			//	var oFCL = this.getRootControl().byId("layout"),
			var oParams = jQuery.sap.getUriParameters(),
				oSettings = {
					defaultTwoColumnLayoutType: sap.f.LayoutType.TwoColumnsMidExpanded,
					mode: oParams.get("mode"),
					initialColumnsCount: oParams.get("initial"),
					maxColumnsCount: oParams.get("max")
				};
			return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
		},

		getContentDensityClass: function () {
			this._sContentDensityClass = "sapUiSizeCompact";
			return this._sContentDensityClass;
		},

		addChangeLog: function () {
			var that = this;
			$(document).bind("keydown", function (oEvt) {
				if (oEvt.altKey && oEvt.keyCode === 73) {
					var bugs = that.getModel("releaseLog").getProperty("/bugs");
					var list = new sap.m.VBox();
					$.each(bugs, function (i, text) {
						var link = new sap.m.Link({
							text: text,
							press: function (evt) {
								sap.m.URLHelper.redirect(evt.getSource().getText(), true);
							}
						});
						list.addItem(link);
					});
					/*var logDialog = new LogDialog({
						fileData: list,
					});*/
					// Just open a dialog that contains this information.
					var sampleDialog = new sap.m.Dialog({
						title: "Version",
						content: list,
						endButton: new sap.m.Button({
							press: function (oEvent) {
								sampleDialog.close();
							},
							text: "Ok"
						}),
						afterClose: function (oEvent1) {
							sampleDialog.destroy();
						}
					}).addStyleClass("sapUiResponsiveContentPadding");
					sampleDialog.open();

				}
			});
		}

	});
});