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
				this.getMetricsCredentials();
			}
		},

		/** Method for clear all filters**/
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
			});
		},

		onChanageLicenseType: function (evt) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sObj = evt.getParameter("selectedItem").getBindingContext("jsonModel").getObject();
			jsonModel.setProperty("/sLinObj", sObj);
			this.getView().byId("labResultsTable").clearSelection();
		},

		loadMasterData: function (filters) {
			//	this.clearAllFilters();
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var licenseNo = jsonModel.getProperty("/selectedLicense");
			if (!licenseNo) {
				licenseNo = jsonModel.getProperty("/licenseList")[0].Code;
			}
			// if (filters === undefined) {
			// 	filters = [];
			// 	filters = "?$filter=U_NLFID eq " + "'" + licenseNo + "' and U_NCPST eq 'X' and U_NCQTY ne 0";
			// } else {
			// 	filters = "?$filter=U_NLFID eq " + "'" + licenseNo + "' and U_NCPST eq 'X'  and (" + filters + ") and and U_NCQTY ne 0";
			// }
			// https://glasshouseweb.seedandbeyond.com:50000/b1s/v1/Users?$select=InternalKey,UserCode,UserName,U_License
			var fields = "?$select=InternalKey,UserCode,UserName,U_License";
			this.readServiecLayer("/b1s/v2/Users" + fields, function (data) {

				jsonModel.setProperty("/cloneTableData", data.value);
				this.byId("tableHeader").setText("Users (" + data.value.length + "/" + data.value.length + ")");

			});
		},

		handleRowSelection: function (evt) {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			jsonModel.setProperty("/compressedData", "");
			// var docNo = evt.getParameter("rowContext").getObject().U_License;
			var docNo = evt.getParameter("listItem").getBindingContext("jsonModel").getObject().U_License;

			jsonModel.setProperty("/oClickedRowData", evt.getParameter("listItem").getBindingContext("jsonModel").getObject());
			var oClickedRowData = JSON.parse(docNo);
			var compressedData = [];
			// var oClickedRowData = JSON.parse(that.docNoLisence);
			// https://glasshouseweb.seedandbeyond.com:50000/b1s/v1/Users?$select=InternalKey,UserCode,UserName,U_License
			var fields = "?$select=U_MetrcLicense,U_MetrcLocation,Sublevel2,BinCode,AbsEntry,Warehouse";
			this.getView().setBusy(true);
			this.readServiecLayer("/b1s/v2/BinLocations" + fields, function (data) {
				var locations = [];
				$.each(data.value, function (i, n) {
					n.switchStatus = false;
					if (n.U_MetrcLicense != null) {
						locations.push(n);
					}
				});

				jsonModel.setProperty("/binLocationData", locations);

				this.getView().setBusy(false);
				if (oClickedRowData != null) {
					$.each(oClickedRowData, function (i, obj) {

						// if ( obj.U_License != null && JSON.parse(obj.U_License).length > 0) {

						if (obj.key != null && obj.key != undefined) {
							$.each(locations, function (j, sObj) {

								// $.each(obj.key , function(k,m){
								if (obj.key == sObj.U_MetrcLicense && sObj.U_MetrcLicense != null) {

									compressedData.push(sObj);

								}
								// })
								// if (obj.U_License != null &&  sObj.U_MetrcLicense != null && obj.U_License == sObj.U_MetrcLicense) {
								// 	compressedData.push(sObj);
								// }

							});
						}

						// var returnObj = $.grep(data.value, function (ele) {
						// 	if (obj.U_License == ele.U_MetrcLicense) {
						// 		return ele;
						// 	}
						// });

						// if(returnObj.length > 0){
						// 	compressedData.push(returnObj[0]);
						// }

					});
				}
				var insideArr = [];
				var data = that.removeDuplicateNames(compressedData);
				$.each(data, function (j, k) {
					k.switchStatus = true;

					$.each(locations, function (i, m) {
						if (k.U_MetrcLicense != m.U_MetrcLicense) {
							insideArr.push(m);
						}
					});

				});

				var compressLocationData = that.removeDuplicateNames(locations);
				var combinedArray = compressLocationData.concat(data);
				var displayLisense = that.removeDuplicateNames(combinedArray);

				// jsonModel.setProperty("/compressedData", data);
				jsonModel.setProperty("/compressedData", displayLisense);

			});

		},

		onChangeActive: function (evt) {
			var that = this;
			var buttonState = evt.getParameter("state");
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var oClickedRowData = jsonModel.getProperty("/oClickedRowData");
			var oContext = evt.getSource().getParent().getBindingContext("jsonModel");
			var oModel = oContext.getModel();
			var sPath = oContext.getPath();
			var oData = oModel.getProperty(sPath).U_MetrcLicense;

			var filter = "?$filter=UserName eq '" + oClickedRowData.UserName + "' ";
			var fields = "&$select=InternalKey,UserCode,UserName,U_License";
			this.readServiecLayer("/b1s/v2/Users" + filter + fields, function (data) {
				jsonModel.setProperty("/simpleData", data.value);
				if (buttonState) {
					if (JSON.parse(data.value[0].U_License) != null) {
						var Arr = [];
						var obj2 = {
							"key": oData
						};
						Arr.push(obj2);
						$.each(JSON.parse(data.value[0].U_License), function (i, m) {

							var Obj = {
								"key": m.key
							};

							Arr.push(Obj);
						});

						var payload = JSON.stringify(Arr);

						var uploadPayLoad = {
							"U_License": payload
						};

						var ok = uploadPayLoad;

						that.updateServiecLayer("/b1s/v2/Users(" + Number(data.value[0].InternalKey) + ")", function () {
							that.loadMasterData();
						}.bind(that), uploadPayLoad, "PATCH");

					} else {

						var obj = {
							"key": oData
						};
						var Arr = [];
						Arr.push(obj);
						var payload = JSON.stringify(Arr);
						var uploadPayLoad = {
							// "U_License":  Arr
							"U_License": payload,
						};

						var ok = uploadPayLoad;

						that.updateServiecLayer("/b1s/v2/Users(" + Number(data.value[0].InternalKey) + ")", function () {
							that.loadMasterData();
						}.bind(that), uploadPayLoad, "PATCH");

					}

				} else {
					if (JSON.parse(data.value[0].U_License) != null) {
						var Arr = [];
						var lisence = oData;
						$.each(JSON.parse(data.value[0].U_License), function (i, m) {
							if (m.key != lisence) {
								var Obj = {
									"key": m.key
								};

								Arr.push(Obj);
							}
						});

						var payload = JSON.stringify(Arr);

						var uploadPayLoad = {
							"U_License": payload
						};

						var ok = uploadPayLoad;

						that.updateServiecLayer("/b1s/v2/Users(" + Number(data.value[0].InternalKey) + ")", function () {
							that.loadMasterData();
						}.bind(that), uploadPayLoad, "PATCH");

					} else {
						var nullobj = {
							"U_License": null
						};
						that.updateServiecLayer("/b1s/v2/Users(" + Number(data.value[0].InternalKey) + ")", function () {
							that.loadMasterData();
						}.bind(that), nullobj, "PATCH");
					}

				}

			});

			//	 "[{\"key\": \"C12-1000001-LIC\"}]"
			var uploadPayLoad = {
				//		"U_License":  "[{\"key\": \+ C12-1000001-LIC +\"}]"
			};

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

		clearData: function () {
			this.byId("labResultsTable").clearSelection();
			//this.byId("releaseTo").setSelectedKey("");
			//this.byId("search").setValue();
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

		/*Methods for multiInput for sarch field for scan functionality start*/
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
			// this.loadData(orFilter);
		},

	});
});