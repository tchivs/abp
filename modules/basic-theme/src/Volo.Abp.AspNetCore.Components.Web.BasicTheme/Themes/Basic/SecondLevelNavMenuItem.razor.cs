using System;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Routing;
using Volo.Abp.AspNetCore.Components.Web.Theming.Layout;

namespace Volo.Abp.AspNetCore.Components.Web.BasicTheme.Themes.Basic;

public partial class SecondLevelNavMenuItem : IDisposable
{
    [Inject]
    private NavigationManager NavigationManager { get; set; }

    [Inject]
    protected PageLayout PageLayout { get; set; }

    [Parameter]
    public MenuViewModel Menu { get; set; }

    [Parameter]
    public MenuItemViewModel MenuItem { get; set; }

    protected override void OnInitialized()
    {
        NavigationManager.LocationChanged += OnLocationChanged;
    }

    protected virtual void OnLocationChanged(object sender, LocationChangedEventArgs e)
    {
        Menu.CloseAll();
        Menu.InvokeStateChanged();
    }

    protected virtual void ToggleMenu()
    {
        Menu.ToggleOpen(MenuItem);
    }

    public virtual void Dispose()
    {
        NavigationManager.LocationChanged -= OnLocationChanged;
    }
}
