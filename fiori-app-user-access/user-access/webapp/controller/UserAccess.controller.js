sap.ui.define([
	"com/9b/useracc/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/9b/useracc/model/models",
	"sap/ndc/BarcodeScanner",
	"sap/ui/core/format/DateFormat"
], function (BaseController, Fragment, Filter, FilterOperator, model, BarcodeScanner, DateFormat) {
	"use strict";

	return BaseController.extend("com.9b.useracc.controller.UserAccess", {
		formatter: model,

		onInit: function () {
			this.getAppConfigData();
			this.combinedFilter = [];
			this.getOwnerComponent().getRouter(this).attachRoutePatternMatched(this._objectMatched, this);
			var that = this;
			setInterval(function () {
				that.loadMasterData();
			}, 1800000);
		},
		_objectMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "userAccess") {
				sap.ui.core.BusyIndicator.hide();
				// this.getView().byId("labResultsTable").clearSelection();
				this.loadLicenseData();
				this.getOwnerComponent().getModel("jsonModel").setProperty("/tagArray", []);
				this.getOwnerComponent().getModel("jsonModel").setProperty("/visibleFooter", false);
				this.getMetricsCredentials();
			}
		},
		loadLicenseData: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			jsonModel.setProperty("/licBusy", true);
			var filters = "?$filter=contains(U_NLCTP, 'Cultivator')";
			this.readServiecLayer("/b1s/v2/U_SNBLIC" + filters, function (data) {
				jsonModel.setProperty("/licBusy", false);
				jsonModel.setProperty("/licenseList", data.value);
				jsonModel.setProperty("/sLinObj", data.value[0]);
				that.loadMasterData();
				that.binLocationsGetCall();
			});
		},
		binLocationsGetCall: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var fields = "?$select=U_MetrcLicense,U_MetrcLocation,Sublevel2,BinCode,AbsEntry,Warehouse";
			this.readServiecLayer("/b1s/v2/BinLocations" + fields, function (data) {
				jsonModel.setProperty("/binlocationsData", data.value);
			});
		},
		loadMasterData: function (filters) {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var licenseNo = jsonModel.getProperty("/selectedLicense");
			if (!licenseNo) {
				licenseNo = jsonModel.getProperty("/licenseList")[0].Code;
			}
			var fields = "?$select=InternalKey,UserCode,UserName,U_License&$orderby=UserName asc";
			this.readServiecLayer("/b1s/v2/Users" + fields, function (data) {
				jsonModel.setProperty("/cloneTableData", data.value);
				this.byId("tableHeader").setText("Users (" + data.value.length + "/" + data.value.length + ")");
			});
		},

		handleRowSelection: function (evt) {
			var that = this;
			this.loadMasterData();
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var binlocationsData = jsonModel.getProperty("/binlocationsData");
			jsonModel.setProperty("/compressedData", "");
			var docNo = evt.getParameter("listItem").getBindingContext("jsonModel").getObject().U_License;
			this.InternalKey = evt.getParameter("listItem").getBindingContext("jsonModel").getObject().InternalKey;
			jsonModel.setProperty("/oClickedRowData", evt.getParameter("listItem").getBindingContext("jsonModel").getObject());
			var oClickedRowData = JSON.parse(docNo);
			var compressedData = [];
			this.getView().setBusy(true);

			var locations = [];
			$.each(binlocationsData, function (i, n) {
				n.switchStatus = false;
				n.switchEnable = false;
				if (n.U_MetrcLicense != null) {
					locations.push(n);
				}
			});

			this.getView().setBusy(false);
			if (oClickedRowData != null) {
				$.each(oClickedRowData, function (i, obj) {
					if (obj.key != null && obj.key != undefined) {
						$.each(locations, function (j, sObj) {
							if (obj.key == sObj.U_MetrcLicense && sObj.U_MetrcLicense != null) {
								compressedData.push(sObj);
							}
						});
					}
				});
			}
			var insideArr = [];
			var data = that.removeDuplicateNames(compressedData);
			$.each(data, function (j, k) {
				k.switchStatus = true;
				k.switchEnable = false;
				$.each(locations, function (i, m) {
					if (k.U_MetrcLicense != m.U_MetrcLicense) {
						insideArr.push(m);
					}
				});
			});
			var compressLocationData = that.removeDuplicateNames(locations);
			var combinedArray = compressLocationData.concat(data);
			var displayLisense = that.removeDuplicateNames(combinedArray);
			jsonModel.setProperty("/compressedData", displayLisense);
		},
		removeDuplicateNames: function (arr) {
			const uniqueNames = {};
			return arr.filter(item => {
				if (!uniqueNames[item.U_MetrcLicense]) {
					uniqueNames[item.U_MetrcLicense] = true;
					return true;
				}
				return false;
			});
		},
		handleEdit: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var compressedData = jsonModel.getProperty("/compressedData");
			$.each(compressedData, function (i, n) {
				n.switchEnable = true;
			});
			jsonModel.setProperty("/compressedData", compressedData);
			this.getOwnerComponent().getModel("jsonModel").setProperty("/visibleFooter", true);
		},
		handleCancelEdit: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var compressedData = jsonModel.getProperty("/compressedData");
			$.each(compressedData, function (i, n) {
				n.switchEnable = false;
			});
			jsonModel.setProperty("/compressedData", compressedData);
			this.getOwnerComponent().getModel("jsonModel").setProperty("/visibleFooter", false);
		},
		onChangeActive: function (evt) {
			var that = this;
			var buttonState = evt.getParameter("state");
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var oClickedRowData = jsonModel.getProperty("/oClickedRowData");
			var obj = evt.getSource().getParent().getBindingContext("jsonModel").getObject();
			obj.switchStatus = buttonState;
		},
		handleAccessUpdate: function () {
			var that = this;
			var InternalKey = that.InternalKey;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems = jsonModel.getProperty("/compressedData");
			var batchUrl = [];
			var payLoadObj = [];
			$.each(sItems, function (i, e) {
				if (e.switchStatus == true) {
					payLoadObj.push({
						"key": e.U_MetrcLicense
					});
				}
			});
			var payLoadAcess = {
				"U_License": JSON.stringify(payLoadObj)
			};
			batchUrl.push({
				url: "/b1s/v2/Users(" + Number(InternalKey) + ")",
				data: payLoadAcess,
				method: "PATCH"
			});
			jsonModel.setProperty("/errorTxt", []);
			that.createBatchCall(batchUrl, function () {
				sap.m.MessageToast.show("Status changed successfully");
				that.loadMasterData();
				that.handleCancelEdit();
				that.getOwnerComponent().getModel("jsonModel").setProperty("/visibleFooter", false);
			});
		},
		onSearch6: function (oEvent) {
			var oTableSearchState = [],
				sQuery = oEvent.getParameter("newValue");
			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [
					new Filter("UserName", FilterOperator.Contains, sQuery, false),
					new Filter("UserCode", FilterOperator.Contains, sQuery, false)
				];
				var combinedFilter = new Filter({
					filters: oTableSearchState,
					and: false
				});
				this.getView().byId("labResultsTable").getBinding("items").filter([combinedFilter]);
			} else {
				this.getView().byId("labResultsTable").getBinding("items").filter([]);
			}
		},
		clearAllFilters: function () {
			this.onCloseRefreshChart();
			var filterTable = this.getView().byId("labResultsTable");
			var aColumns = filterTable.getColumns();
			for (var i = 0; i <= aColumns.length; i++) {
				filterTable.filter(aColumns[i], null);
				filterTable.sort(aColumns[i], null);
			}
			this.byId("searchFieldTable").removeAllTokens();
		},
		fillFilterLoad: function (elementC, removedText) {
			var orFilter = [];
			var andFilter = [];
			$.each(elementC.getTokens(), function (i, info) {
				var value = info.getText();
				if (value !== removedText) {
					orFilter.push(new sap.ui.model.Filter("UserName", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("UserCode", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_NPLID", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_NPLNM", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_NLCNM", "Contains", value.toLowerCase()));
					//orFilter.push(new sap.ui.model.Filter("U_NVGRD", "GE",   value.toLowerCase() ));
					andFilter.push(new sap.ui.model.Filter({
						filters: orFilter,
						and: false,
						caseSensitive: false
					}));
				}
			});
			this.byId("labResultsTable").getBinding("rows").filter(andFilter);
		},
		// onChangeActive: function (evt) {
		// 	var that = this;
		// 	var buttonState = evt.getParameter("state");
		// 	var jsonModel = this.getOwnerComponent().getModel("jsonModel");
		// 	var oClickedRowData = jsonModel.getProperty("/oClickedRowData");
		// 	var oContext = evt.getSource().getParent().getBindingContext("jsonModel");
		// 	var oModel = oContext.getModel();
		// 	var sPath = oContext.getPath();
		// 	var oData = oModel.getProperty(sPath).U_MetrcLicense;

		// 	var filter = "?$filter=UserName eq '" + oClickedRowData.UserName + "' ";
		// 	var fields = "&$select=InternalKey,UserCode,UserName,U_License";
		// 	this.readServiecLayer("/b1s/v2/Users" + filter + fields, function (data) {
		// 		jsonModel.setProperty("/simpleData", data.value);
		// 		if (buttonState) {
		// 			if (JSON.parse(data.value[0].U_License) != null) {
		// 				var Arr = [];
		// 				var obj2 = {
		// 					"key": oData
		// 				};
		// 				Arr.push(obj2);
		// 				$.each(JSON.parse(data.value[0].U_License), function (i, m) {
		// 					var Obj = {
		// 						"key": m.key
		// 					};
		// 					Arr.push(Obj);
		// 				});
		// 				var payload = JSON.stringify(Arr);
		// 				var uploadPayLoad = {
		// 					"U_License": payload
		// 				};
		// 				var ok = uploadPayLoad;
		// 				that.updateServiecLayer("/b1s/v2/Users(" + Number(data.value[0].InternalKey) + ")", function () {
		// 					that.loadMasterData();
		// 				}.bind(that), uploadPayLoad, "PATCH");
		// 			} else {
		// 				var obj = {
		// 					"key": oData
		// 				};
		// 				var Arr = [];
		// 				Arr.push(obj);
		// 				var payload = JSON.stringify(Arr);
		// 				var uploadPayLoad = {
		// 					"U_License": payload,
		// 				};
		// 				var ok = uploadPayLoad;
		// 				that.updateServiecLayer("/b1s/v2/Users(" + Number(data.value[0].InternalKey) + ")", function () {
		// 					that.loadMasterData();
		// 				}.bind(that), uploadPayLoad, "PATCH");
		// 			}
		// 		} else {
		// 			if (JSON.parse(data.value[0].U_License) != null) {
		// 				var Arr = [];
		// 				var lisence = oData;
		// 				$.each(JSON.parse(data.value[0].U_License), function (i, m) {
		// 					if (m.key != lisence) {
		// 						var Obj = {
		// 							"key": m.key
		// 						};
		// 						Arr.push(Obj);
		// 					}
		// 				});
		// 				var payload = JSON.stringify(Arr);
		// 				var uploadPayLoad = {
		// 					"U_License": payload
		// 				};
		// 				var ok = uploadPayLoad;
		// 				that.updateServiecLayer("/b1s/v2/Users(" + Number(data.value[0].InternalKey) + ")", function () {
		// 					that.loadMasterData();
		// 				}.bind(that), uploadPayLoad, "PATCH");
		// 			} else {
		// 				var nullobj = {
		// 					"U_License": null
		// 				};
		// 				that.updateServiecLayer("/b1s/v2/Users(" + Number(data.value[0].InternalKey) + ")", function () {
		// 					that.loadMasterData();
		// 				}.bind(that), nullobj, "PATCH");
		// 			}
		// 		}
		// 	});
		// },

	});
});