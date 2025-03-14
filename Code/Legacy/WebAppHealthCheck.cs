using ClientDependency.Core.CompositeFiles.Providers;
using ClientDependency.Core.Config;
using DelftDI.Common.RIS.Common;
using DelftDI.ZillionRis.Logging;
using Microsoft.Win32;
using Rogan.ZillionRis.Data;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Scheduling;
using Rogan.ZillionRis.Web;
using Rogan.ZillionRis.Web.Health;
using Rogan.ZillionRis.Web.Reflection;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Printing;
using System.ServiceProcess;
using System.Threading;
using System.Transactions;
using System.Web.Configuration;

namespace Rogan.ZillionRis.Website.Code.Legacy
{
    public class WebAppHealthCheck : ZillionRisBaseTask
    {
        [TaskAction(WorkflowIntent.Action_HealthCheck)]
        [TaskActionIntent(WorkflowIntent.Action_HealthCheck)]
        public ModuleStatusCollection Status()
        {
            var list = new ModuleStatusCollection();

            list.Add("ASP.NET - Machine Key", "Checks machine key configuration", null, CheckAspNetMachineKey);
            list.Add("Printer Access", "Attempts to connect to all the registered printers.", null, CheckPrinters);
            list.Add("Zillion RIS - Client Dependency",
                "Client Dependency is used for JS and CSS resource optimalization.", null, CheckClientDependency);

            // Database consistency.
            list.Add("Consistency Check - Rooms", "Only one resource per room", null, Consistency_OneResourcePerRoom);
            list.Add("Consistency Check - Examination Type Actions", "Examination types have only one action", null,
                Consistency_ExaminationTypeActions);
            list.Add("Consistency Check - Examination Type Action Requirements",
                "Atleast one action requirement per examination type", null,
                Consistency_ExaminationTypeActionRequirements);
            list.Add("Consistency Check - All action requirements have schedules",
                "All possible action requirements have valid schedules", null, Consistency_ActionRequirements);
            list.Add("Consistency Check - Physician has referral type", "Physician requires atleast one referral type",
                null, Consistency_PhysicianReferralTypes);
            list.Add("Consistency Check - Rooms must have atleast one action requirement",
                "Each room must have an examination type assigned", null, Consistency_RoomHasActionRequirements);
            //list.Add("Consistency Check - Examination Types Schedulable", "Resolves a schedule for each examination type", null, this.Consistency_Schedulable);

            list.Add("MSDTC",
                "Verifies Microsoft Distribute Transaction Coordinator configuration. http://msdn.microsoft.com/en-us/library/aa561924.aspx",
                null, VerifyMsdtc);

            return list;
        }

        public class MockTransactionEnlistment : IEnlistmentNotification
        {
            public static readonly Guid ID = new Guid("{A255DAA5-F6FD-4E51-948D-5D63626AF440}");

            public void Prepare(PreparingEnlistment preparingEnlistment)
            {
                preparingEnlistment.Prepared();
            }

            public void Commit(Enlistment enlistment)
            {
                enlistment.Done();
            }

            public void Rollback(Enlistment enlistment)
            {
                enlistment.Done();
            }

            public void InDoubt(Enlistment enlistment)
            {
                enlistment.Done();
            }
        }

        private void VerifyMsdtc(IModuleStatusBuilder obj)
        {
            // Verify configuration in the registry.
            const string securityKey = @"SOFTWARE\Microsoft\MSDTC\Security";
            VerifyRegDWord(obj, "Network DTC Access", 1, "Turned on", "Turned off!", securityKey, "NetworkDtcAccess",
                ModuleStatusScore.Invalid);
            VerifyRegDWord(obj, "Allow Remote Clients", 1, "Turned on", "Turned off!", securityKey,
                "NetworkDtcAccessClients", ModuleStatusScore.Invalid);
            VerifyRegDWord(obj, "Allow Inbound", 1, "Turned on", "Turned off!", securityKey, "NetworkDtcAccessInbound",
                ModuleStatusScore.Invalid);
            VerifyRegDWord(obj, "Allow Outbound", 1, "Turned on", "Turned off!", securityKey, "NetworkDtcAccessOutbound",
                ModuleStatusScore.Invalid);
            VerifyRegDWord(obj, "Allow Inbound & Allow Outbound", 1, "Turned on", "Turned off!", securityKey,
                "NetworkDtcAccessTransactions", ModuleStatusScore.Invalid);
            VerifyRegDWord(obj, "XA Transactions", 1, "Turned on", "Turned off!", securityKey, "XaTransactions",
                ModuleStatusScore.Invalid);

            // Verify the service status of MSDTC
            obj.Add("Service Status", delegate
            {
                var control = new ServiceController("MSDTC");
                var status = control.Status;
                control.Dispose();

                if (status != ServiceControllerStatus.Running)
                    throw new ModuleStatusException(ModuleStatusScore.Invalid, "Service is not running: " + status);
                throw new ModuleStatusException(ModuleStatusScore.Ommit, "OK");
            });

            // Attempt to elevate a transaction to MSDTC.
            obj.Add("Escalated Transaction Test", delegate
            {
                var finished = new ManualResetEventSlim(false);
                var success = false;
                Exception error = null;

                // Don't wait for this to timeout by itself (sometimes takes very long even though the timeout is at 5 seconds.
                ThreadPool.QueueUserWorkItem(state =>
                {
                    try
                    {
                        using (var x = new TransactionScope(TransactionScopeOption.RequiresNew, TimeSpan.FromSeconds(5))
                            )
                        {
                            Transaction.Current.EnlistDurable(MockTransactionEnlistment.ID,
                                new MockTransactionEnlistment(),
                                EnlistmentOptions.None);
                            x.Complete();
                        }
                        success = true;
                    }
                    catch (Exception ex)
                    {
                        error = ex;
                    }
                    finished.Set();
                });

                finished.Wait(TimeSpan.FromSeconds(5));

                if (success)
                    throw new ModuleStatusException(ModuleStatusScore.Ommit, "Success!");
                if (error != null)
                    throw new ModuleStatusException(ModuleStatusScore.Invalid, "Creating a transaction scope failed.",
                        error);
                throw new ModuleStatusException(ModuleStatusScore.Invalid,
                    "Creating a transaction scope timed out, indicating a problem. It has been given 5 seconds.");
            });
        }

        private static void VerifyRegDWord(IModuleStatusBuilder obj, string title, int requiredValue, string right,
            string wrong, string key, string value, ModuleStatusScore errorCode)
        {
            obj.Add(title, delegate
            {
                using (var view = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64))
                using (var reg = view.OpenSubKey(key))
                {
                    if (reg == null)
                    {
                        throw new ModuleStatusException(errorCode, wrong);
                    }

                    var val = reg.GetValue(value, 0);

                    if (val == null || (int) val != requiredValue)
                    {
                        throw new ModuleStatusException(errorCode, wrong);
                    }

                    throw new ModuleStatusException(ModuleStatusScore.Ommit, right);
                }
            });
        }

        private void Consistency_RoomHasActionRequirements(IModuleStatusBuilder obj)
        {
            var dc = DataContextFactory.CreateNew();
            var rooms = dc.Rooms
                .Select(x => new
                {
                    Name = x.roo_RoomName,
                    HasActionRequirments = x.Resources
                        .SelectMany(y => y.ActionRequirements)
                        .SelectMany(z => z.Action.ExaminationTypeActions)
                        .Any(
                            z =>
                                z.ExaminationType.exatyp_Inactive == null ||
                                z.ExaminationType.exatyp_Inactive > DateTime.Today)
                });

            foreach (var room in rooms)
            {
                var room1 = room;
                obj.Add(room1.Name, delegate
                {
                    if (room1.HasActionRequirments == false)
                    {
                        throw new ModuleStatusException(ModuleStatusScore.Inconclusive,
                            "No active examinations assigned");
                    }

                    throw new ModuleStatusException(ModuleStatusScore.Ommit, "Valid");
                });
            }
        }

        private void Consistency_Schedulable(IModuleStatusBuilder builder)
        {
            var dataContext = DataContextFactory.CreateNew();
            var examTypes = dataContext.ExaminationTypes
                .Where(x => x.exatyp_Inactive == null || x.exatyp_Inactive > DateTime.Now)
                .Select(x => new
                {
                    x.exatyp_ExaminationTypeCode,
                    x.exatyp_ExaminationTypeID
                })
                .ToList();
            var locations = dataContext.Locations.Select(x => x.loc_LocationID).ToList();

            var sharedDataAccess = new DMSchedulingDataAccess(dataContext);
            foreach (var item in examTypes)
            {
                var capturedItem = item;

                builder.Add(item.exatyp_ExaminationTypeCode, delegate
                {
                    var valid = false;
                    foreach (var locationID in locations)
                    {
                        try
                        {
                            // Initialize the scheduling interface.
                            var schedulingInterface = new DMSchedulingInterface(sharedDataAccess);
                            schedulingInterface.SchedulingRangeLocal = new DateTimeSpan(DateTime.Today,
                                DateTime.Today.AddDays(7));
                            schedulingInterface.ExaminationID = 0;
                            schedulingInterface.ExaminationTypeID = capturedItem.exatyp_ExaminationTypeID;
                            schedulingInterface.CustomDuration = null;
                            schedulingInterface.LocationID = locationID;
                            schedulingInterface.HypotheticalSchedule = true;
                            schedulingInterface.Calculate();

                            if (schedulingInterface.ActionScheduleInformationList.Count <= 0)
                            {
                                continue;
                            }

                            valid = true;

                            break;
                        }
                        catch (Exception ex)
                        {
                            const string msg = "Unable to schedule location {0}";
                            ZillionRisLog.Default.Error(string.Format(msg, locationID), ex);
                        }
                    }

                    if (valid)
                    {
                        throw new ModuleStatusException(ModuleStatusScore.Ommit, "Schedulable");
                    }

                    throw new ModuleStatusException(ModuleStatusScore.Invalid,
                        "Can not be scheduled in the next 60 days.");
                });
            }
        }

        private void Consistency_ExaminationTypeActionRequirements(IModuleStatusBuilder builder)
        {
            var dc = DataContextFactory.CreateNew();
            var pr = dc.ExaminationTypes
                .Where(x => x.exatyp_Inactive == null || x.exatyp_Inactive > DateTime.Now)
                .Select(x => new
                {
                    x.exatyp_ExaminationTypeCode,
                    ActionRequirements =
                        x.ExaminationTypeActions.SelectMany(y => y.Action.ActionRequirements).Count(),
                    ZeroMinutes =
                        x.ExaminationTypeActions.SelectMany(y => y.Action.ActionRequirements)
                            .Select(y => new {y.actreq_Minutes, y.Resource.Room.roo_RoomName})
                            .Where(y => y.actreq_Minutes == 0),
                })
                .ToList();

            foreach (var x in pr)
            {
                var x1 = x;
                builder.Add(x1.exatyp_ExaminationTypeCode,
                    () =>
                    {
                        if (x1.ActionRequirements == 0)
                            throw new ModuleStatusException(ModuleStatusScore.Invalid, "No action requirements");
                        throw new ModuleStatusException(ModuleStatusScore.Ommit, "Valid");
                    });

                builder.Add(x1.exatyp_ExaminationTypeCode,
                    () =>
                    {
                        if (x1.ZeroMinutes.Any())
                            throw new ModuleStatusException(ModuleStatusScore.Invalid,
                                string.Format("Zero duration in rooms: {0}.",
                                    x1.ZeroMinutes.OrderBy(
                                        y =>
                                            y.roo_RoomName)
                                        .Select(y => y.roo_RoomName)
                                        .JoinText(", ")));
                        throw new ModuleStatusException(ModuleStatusScore.Ommit, "Valid");
                    });
            }

            //if (pr.Count > 0)
            //{
            //    throw new ModuleStatusException(ModuleStatusScore.Invalid, pr.Select(x=>x.exatyp_ExaminationTypeCode).JoinText(", "));
            //}
        }

        private void Consistency_PhysicianReferralTypes()
        {
            var dc = DataContextFactory.CreateNew();
            var pr = dc.Physicians
                .Where(x => x.phy_DateTimeInactive == null || x.phy_DateTimeInactive > DateTime.Now)
                .Select(x => new
                {
                    x.phy_PhysicianCode,
                    x.phy_PhysicianID,
                    ReferralTypes =
                        x.ReferralTypes.Count(y =>
                            y.reftyp_DateTimeInactive == null ||
                            y.reftyp_DateTimeInactive > DateTime.Now)
                })
                .Where(x => x.ReferralTypes == 0)
                .ToList();

            if (pr.Count > 0)
            {
                throw new ModuleStatusException(ModuleStatusScore.Inconclusive,
                    pr.Select(x => string.Format("{0} (ID {1})", x.phy_PhysicianCode, x.phy_PhysicianID)).JoinText(", "));
            }
        }

        private void CheckAspNetMachineKey()
        {
            var machineKeySection = (MachineKeySection) WebConfigurationManager.GetSection("system.web/machineKey");
            if (machineKeySection == null)
                throw new ModuleStatusException(ModuleStatusScore.Inconclusive,
                    "No machine key section specified, which is recommended in multi server environments.");
            if (string.IsNullOrWhiteSpace(machineKeySection.DecryptionKey) ||
                string.IsNullOrWhiteSpace(machineKeySection.ValidationKey))
                throw new ModuleStatusException(ModuleStatusScore.Inconclusive,
                    "No machine key decryption or validation key specified, which is recommended in multi server environments.");
        }

        private void CheckClientDependency()
        {
            var foldersToCheck = new List<DirectoryInfo>();

            var defaultCompositeProvider = ClientDependencySettings.Instance.DefaultCompositeFileProcessingProvider;
            foldersToCheck.Add(defaultCompositeProvider.CompositeFilePath);

            var compositeProviders = ClientDependencySettings.Instance.CompositeFileProcessingProviderCollection;
            foreach (BaseCompositeFileProcessingProvider provider in compositeProviders)
            {
                foldersToCheck.Add(provider.CompositeFilePath);
            }

            foreach (DirectoryInfo folder in foldersToCheck)
            {
                if (folder.Exists == false)
                    throw new ModuleStatusException(ModuleStatusScore.Invalid,
                        string.Format("{0} does not exist.", folder.FullName));

                try
                {
                    var path = Path.Combine(folder.FullName, "__healthcheck.tmp");
                    new FileStream(path, FileMode.Create, FileAccess.ReadWrite, FileShare.ReadWrite | FileShare.Delete,
                        4096, FileOptions.DeleteOnClose).Close();
                }
                catch (Exception ex)
                {
                    throw new ModuleStatusException(ModuleStatusScore.Invalid,
                        string.Format("Unable to write to the temporary folder {0}:\r\n{1}", folder.FullName, ex.Message),
                        ex);
                }
            }
        }

        private void CheckPrinters(IModuleStatusBuilder builder)
        {
            var db = new ZillionRIS_Entities();
            foreach (Printer printer in db.Printers)
            {
                var printerName = printer.pri_PrinterName;
                if (printerName == "PDF")
                    continue;

                builder.Add(printer.pri_PrinterDescription, () =>
                {
                    PrintServer printerServer = null;
                    PrintQueue printQueue = null;

                    try
                    {
                        var p = new Uri(printerName);

                        try
                        {
                            printerServer = new PrintServer(@"\\" + p.Authority);
                        }
                        catch (Exception ex)
                        {
                            throw new ModuleStatusException(ModuleStatusScore.Invalid,
                                string.Format("Unable to reach the server associated with the printer {1}:\r\n{0}",
                                    ex.Message, printerName), ex);
                        }

                        try
                        {
                            printQueue = printerServer.GetPrintQueue(p.Segments[1]);
                        }
                        catch (Exception ex)
                        {
                            throw new ModuleStatusException(ModuleStatusScore.Invalid,
                                string.Format(
                                    "Connected successfully to the server, but the printer name is invalid or inaccessable {1}:\r\n{0}",
                                    ex.Message, printerName), ex);
                        }

                        var status = printQueue.QueueStatus;

                        switch (status)
                        {
                            case PrintQueueStatus.None:
                            case PrintQueueStatus.Printing:
                            case PrintQueueStatus.PowerSave:
                                throw new ModuleStatusException(ModuleStatusScore.Ommit, "Connected to the printer");

                            case PrintQueueStatus.Offline:
                                throw new ModuleStatusException(ModuleStatusScore.Invalid,
                                    string.Format("The server reports the printer is offline."));

                            case PrintQueueStatus.Error:
                                throw new ModuleStatusException(ModuleStatusScore.Invalid,
                                    string.Format("The server reports the printer has an error."));

                            case PrintQueueStatus.NotAvailable:
                                throw new ModuleStatusException(ModuleStatusScore.Invalid,
                                    string.Format("The server reports the printer is not available."));

                            case PrintQueueStatus.NoToner:
                                throw new ModuleStatusException(ModuleStatusScore.Notice,
                                    string.Format("The server reports the printer needs toner."));

                            case PrintQueueStatus.PaperJam:
                                throw new ModuleStatusException(ModuleStatusScore.Notice,
                                    string.Format("The server reports the printer has a paper jam."));

                            case PrintQueueStatus.PaperOut:
                                throw new ModuleStatusException(ModuleStatusScore.Notice,
                                    string.Format("The server reports the printer has no more paper."));

                            case PrintQueueStatus.Paused:
                                throw new ModuleStatusException(ModuleStatusScore.Notice,
                                    string.Format("The server reports the printer has been paused."));

                            default:
                                throw new ModuleStatusException(ModuleStatusScore.Invalid,
                                    string.Format("The server reports the current printer status is {0}", status));
                        }
                    }
                    catch (ModuleStatusException)
                    {
                        throw;
                    }
                    catch (Exception ex)
                    {
                        throw new ModuleStatusException(ModuleStatusScore.Invalid,
                            string.Format("{0}; {1}", printerName, ex.Message), ex);
                    }
                    finally
                    {
                        if (printQueue != null)
                            printQueue.Dispose();
                        if (printerServer != null)
                            printerServer.Dispose();
                    }
                });
            }
        }

        private void Consistency_OneResourcePerRoom(IModuleStatusBuilder b)
        {
            b.Add("One resource per room", () =>
            {
                var dc = DataContextFactory.CreateNew();
                var rooms = dc.Rooms
                    .Where(x => x.roo_DateTimeInactive == null || x.roo_DateTimeInactive > DateTime.Today)
                    .Select(x => new
                    {
                        x.roo_RoomName,
                        Count = x.Resources.Count()
                    })
                    .Where(x => x.Count != 1)
                    .ToList();

                if (rooms.Count > 0)
                {
                    throw new ModuleStatusException(ModuleStatusScore.Invalid,
                        rooms.Select(x => string.Format("{0} ({1})", x.roo_RoomName, x.Count)).JoinText(", "));
                }
            });
            b.Add("One modality per room", () =>
            {
                var dc = DataContextFactory.CreateNew();
                var rooms = dc.Rooms
                    .Where(x => x.roo_DateTimeInactive == null || x.roo_DateTimeInactive > DateTime.Today)
                    .Select(x => new
                    {
                        x.roo_RoomName,
                        Count = x.Modalities.Count()
                    })
                    .Where(x => x.Count != 1)
                    .ToList();

                if (rooms.Count > 0)
                {
                    throw new ModuleStatusException(ModuleStatusScore.Invalid,
                        rooms.Select(x => string.Format("{0} ({1})", x.roo_RoomName, x.Count)).JoinText(", "));
                }
            });
            b.Add("Time slot durations required", () =>
            {
                var dc = DataContextFactory.CreateNew();
                var rooms = dc.Rooms
                    .Where(x => x.roo_DateTimeInactive == null || x.roo_DateTimeInactive > DateTime.Today)
                    .Select(x => new
                    {
                        x.roo_RoomName,
                        Duration = x.roo_TimeSlot
                    })
                    .Where(x => x.Duration == null || x.Duration == 0)
                    .ToList();

                if (rooms.Count > 0)
                {
                    throw new ModuleStatusException(ModuleStatusScore.Invalid,
                        rooms.Select(x => string.Format("Room:{0}-Duration:{1}", x.roo_RoomName, x.Duration))
                            .JoinText(", "));
                }
            });
        }

        private void Consistency_ExaminationTypeActions()
        {
            var dc = DataContextFactory.CreateNew();
            var examinationTypeCodes = dc.ExaminationTypes
                .Where(x => x.exatyp_Inactive == null || x.exatyp_Inactive > DateTime.Today)
                .Select(x => new {Code = x.exatyp_ExaminationTypeCode, Actions = x.ExaminationTypeActions.Count()})
                .Where(x => x.Actions != 1)
                .ToList();

            if (examinationTypeCodes.Count > 0)
            {
                throw new ModuleStatusException(ModuleStatusScore.Invalid,
                    examinationTypeCodes.Select(x => string.Format("{0} ({1} actions)", x.Code, x.Actions))
                        .JoinText(", "));
            }
        }

        private void Consistency_ActionRequirements(IModuleStatusBuilder builder)
        {
            var dc = DataContextFactory.CreateNew();
            var etQuery = dc.ExaminationTypes
                .Where(x => x.exatyp_Inactive == null || x.exatyp_Inactive > DateTime.Today);

            var typeNames = etQuery
                .Select(x => new {x.exatyp_ExaminationTypeID, x.exatyp_ExaminationTypeCode})
                .ToDictionary(x => x.exatyp_ExaminationTypeID, x => x.exatyp_ExaminationTypeCode);
            var roomNames = dc.Resources
                .Select(x => new {x.res_ResourceID, x.Room.roo_RoomName})
                .ToDictionary(x => x.res_ResourceID, x => x.roo_RoomName);

            // Create Lookup: Examination Type -> Resource
            var resourcesByType = etQuery
                .SelectMany(x => x.ExaminationTypeActions, (x, y) => new {ExaminationType = x, Actions = y})
                .SelectMany(x => x.Actions.Action.ActionRequirements,
                    (x, y) => new {x.ExaminationType, ActionRequirementss = y})
                .Where(
                    x =>
                        x.ActionRequirementss.Resource.Room.roo_DateTimeInactive == null ||
                        x.ActionRequirementss.Resource.Room.roo_DateTimeInactive > DateTime.Today)
                .Select(
                    x =>
                        new
                        {
                            x.ExaminationType.exatyp_ExaminationTypeID,
                            exatypgrores_ResourceID = (int?) x.ActionRequirementss.Resource.res_ResourceID
                        })
                .ToLookup(x => x.exatyp_ExaminationTypeID, x => x.exatypgrores_ResourceID);

            // For each examination type: the link between examination type and resource must have atleast one schedule intervals. 
            var intervalsType = dc.ExaminationTypes
                .SelectMany(x => x.ExaminationTypeResources,
                    (type, resource) => new {type.exatyp_ExaminationTypeID, resource})
                .Where(x => x.resource.Resource.Room != null)
                .Where(x => x.resource.ScheduleIntervals.Any())
                .ToLookup(x => x.exatyp_ExaminationTypeID, arg => arg.resource.exatypres_ResourceID);

            // For each examination type: the link between examination type group and resource must have atleast one schedule intervals.
            var intervalsGroup = dc.ExaminationTypes
                .SelectMany(x => x.ExaminationGroups, (type, resource) => new {type.exatyp_ExaminationTypeID, resource})
                .SelectMany(x => x.resource.ExaminationTypeGroupResources,
                    (type, resource) => new {type.exatyp_ExaminationTypeID, resource})
                .Where(x => x.resource.Resource.Room != null)
                .Where(x => x.resource.ScheduleIntervals.Any())
                .ToLookup(x => x.exatyp_ExaminationTypeID, arg => arg.resource.exatypgrores_ResourceID);

            // For each examination type: the room used by an examination type must have atleast one schedule intervals.
            var intervalsRoom = dc.ExaminationTypes
                .SelectMany(x => x.ExaminationTypeResources,
                    (type, resource) => new {type.exatyp_ExaminationTypeID, resource})
                .Where(x => x.resource.Resource.Room.ScheduleIntervals.Any())
                .ToLookup(x => x.exatyp_ExaminationTypeID, arg => arg.resource.exatypres_ResourceID);

            foreach (var grouping in resourcesByType)
            {
                var associatedResources = grouping;
                var examTypeID = grouping.Key;

                var byType = intervalsType[examTypeID];
                var byGroup = intervalsGroup[examTypeID];
                var byRoom = intervalsRoom[examTypeID];

                builder.Add(typeNames[examTypeID], () =>
                {
                    var list = new List<string>();
                    foreach (var resourceID in associatedResources)
                    {
                        if (!resourceID.HasValue)
                        {
                            continue;
                        }

                        if (!byType.Contains(resourceID.Value)
                            && !byGroup.Contains(resourceID.Value)
                            && !byRoom.Contains(resourceID.Value))
                        {
                            list.Add(roomNames[resourceID.Value]);
                        }
                    }

                    if (list.Any())
                    {
                        throw new ModuleStatusException(ModuleStatusScore.Notice,
                            string.Format("Can not be automatically booked in: {0}.", list.JoinText(", ")));
                    }
                    throw new ModuleStatusException(ModuleStatusScore.Ommit, string.Format("Valid"));
                });
            }
        }
    }
}