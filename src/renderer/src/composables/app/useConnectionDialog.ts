/**
 * useConnectionDialog - 连接 CRUD
 * 管理：新建/编辑/删除连接
 */
import { type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import type ConnectionDialog from '../../components/ConnectionDialog.vue'

export function useConnectionDialog(
  onConnectionsChanged: () => Promise<void>,
  connectionDialogRef: Ref<InstanceType<typeof ConnectionDialog> | null>
) {
  const { t } = useI18n()

  const openCreateDialog = () => {
    connectionDialogRef.value?.open('ftp')
  }

  const editCreateDialog = (conn: any) => {
    connectionDialogRef.value?.openEdit(conn)
  }

  const handleConnectionSubmit = async (data: any) => {
    try {
      if (data.id) {
        await window.storageApi.updateConnection(data)
      } else {
        await window.storageApi.addConnection(data)
      }
      await onConnectionsChanged()
      connectionDialogRef.value?.closeOnSuccess()
    } catch (error: any) {
      if (error?.message?.includes('已存在相同的连接')) {
        connectionDialogRef.value?.onSaveError(t('dialog.connectionExists'))
      } else {
        connectionDialogRef.value?.onSaveError(t('dialog.completeForm'))
      }
    }
  }

  const deleteConnection = async (conn: any) => {
    try {
      await ElMessageBox.confirm(
        t('dialog.deleteConfirm', { name: conn.name }),
        t('dialog.deleteConnection'),
        {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning',
          center: true,
          cancelButtonClass: 'el-button--danger'
        }
      )
      await window.storageApi.deleteConnection(conn.id)
      await onConnectionsChanged()
    } catch (error) {
      if (error !== 'cancel') {
        console.error(t('common.operationFailed'), error)
        ElMessage.error(t('common.operationFailed'))
      }
    }
  }

  return {
    openCreateDialog,
    editCreateDialog,
    handleConnectionSubmit,
    deleteConnection
  }
}
