import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DocumentPicker from 'react-native-document-picker';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { SuccessModal } from '../components/ui/SuccessModal';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { TextInput } from '../components/ui/TextInput';
import { StatusScreen } from '../components/ui/StatusScreen';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { useTheme } from '../theme/ThemeProvider';
import { extractApiError } from '../api/client';
import { hapticLight } from '../utils/haptics';
import { formatDate } from '../utils/formatDate';
import {
  KBDoc,
  listKBDocs,
  createKBFromText,
  createKBFromUrl,
  createKBFromFile,
  deleteKBDoc,
} from '../api/knowledge-base';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'KnowledgeBase'>;

type AddMode = 'text' | 'url' | 'file' | null;

const SOURCE_ICONS: Record<string, string> = {
  text: 'text-box-outline',
  url: 'link-variant',
  file: 'file-document-outline',
};

export function KnowledgeBaseScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();

  const [docs, setDocs] = useState<KBDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [docName, setDocName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KBDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listKBDocs();
      setDocs(result.items);
    } catch {
      setToastType('error');
      setToast('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDocs();
    }, [loadDocs]),
  );

  function resetForm() {
    setAddMode(null);
    setDocName('');
    setTextContent('');
    setUrlValue('');
    setSelectedFile(null);
  }

  async function handleAddText() {
    if (!docName.trim()) {
      setToastType('error');
      setToast('Please enter a document name');
      return;
    }
    if (!textContent.trim()) {
      setToastType('error');
      setToast('Please enter some text content');
      return;
    }
    setAdding(true);
    try {
      await createKBFromText(docName.trim(), textContent);
      setSuccessModal({ title: 'Added', message: 'Text document added to your knowledge base.' });
      resetForm();
      await loadDocs();
    } catch (err) {
      setToastType('error');
      setToast(extractApiError(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleAddUrl() {
    if (!docName.trim()) {
      setToastType('error');
      setToast('Please enter a document name');
      return;
    }
    if (!urlValue.trim()) {
      setToastType('error');
      setToast('Please enter a URL');
      return;
    }
    setAdding(true);
    try {
      await createKBFromUrl(docName.trim(), urlValue.trim());
      setSuccessModal({ title: 'Added', message: 'URL document added to your knowledge base.' });
      resetForm();
      await loadDocs();
    } catch (err) {
      setToastType('error');
      setToast(extractApiError(err));
    } finally {
      setAdding(false);
    }
  }

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      const picked = result[0];
      if (picked) {
        setSelectedFile({ uri: picked.uri, name: picked.name || 'file' });
        if (!docName.trim()) {
          setDocName(picked.name?.replace(/\.[^.]+$/, '') || '');
        }
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        setToastType('error');
        setToast('Failed to pick file');
      }
    }
  }

  async function handleUploadFile() {
    if (!docName.trim()) {
      setToastType('error');
      setToast('Please enter a document name');
      return;
    }
    if (!selectedFile) {
      setToastType('error');
      setToast('Please pick a file first');
      return;
    }
    setAdding(true);
    try {
      await createKBFromFile(docName.trim(), selectedFile.uri, selectedFile.name);
      setSuccessModal({ title: 'Uploaded', message: 'File uploaded to your knowledge base.' });
      resetForm();
      await loadDocs();
    } catch (err) {
      setToastType('error');
      setToast(extractApiError(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteKBDoc(deleteTarget.id);
      setToastType('success');
      setToast('Document removed');
      await loadDocs();
    } catch (err) {
      setToastType('error');
      setToast(extractApiError(err));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function renderModeTab(mode: AddMode, icon: string, label: string) {
    const active = addMode === mode;
    return (
      <TouchableOpacity
        key={mode}
        onPress={() => {
          hapticLight();
          setAddMode(active ? null : mode);
          setDocName('');
          setTextContent('');
          setUrlValue('');
          setSelectedFile(null);
        }}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.sm,
          borderRadius: radii.md,
          backgroundColor: active ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.border,
        }}
        accessibilityLabel={label}
      >
        <Icon name={icon} size="sm" color={active ? '#fff' : colors.textSecondary} />
        <Text
          style={{
            ...typography.bodySmall,
            color: active ? '#fff' : colors.textSecondary,
            fontWeight: '600',
          }}
          allowFontScaling
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function renderDoc({ item }: { item: KBDoc }) {
    return (
      <Card variant="elevated" style={{ marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary + '14',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={SOURCE_ICONS[item.source_type] || 'file-outline'}
              size="sm"
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
              numberOfLines={1}
              allowFontScaling
            >
              {item.name}
            </Text>
            {item.source_ref ? (
              <Text
                style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}
                numberOfLines={1}
                allowFontScaling
              >
                {item.source_ref}
              </Text>
            ) : (
              <Text
                style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}
                allowFontScaling
              >
                {item.source_type === 'text' ? 'Plain text' : item.source_type}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setDeleteTarget(item);
            }}
            hitSlop={12}
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Icon name="trash-can-outline" size="sm" color={colors.error} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  const header = (
    <View style={{ marginBottom: spacing.md }}>
      {/* Section title */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        <Icon name="book-open-outline" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }} allowFontScaling>
          Knowledge Base
        </Text>
        {docs.length > 0 && (
          <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
            {docs.length} {docs.length === 1 ? 'doc' : 'docs'}
          </Text>
        )}
      </View>

      {/* Add tabs */}
      <Card style={{ marginBottom: spacing.md }}>
        <Text
          style={{ ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm }}
          allowFontScaling
        >
          Add a document
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {renderModeTab('text', 'text-box-outline', 'Text')}
          {renderModeTab('url', 'link-variant', 'URL')}
          {renderModeTab('file', 'file-upload-outline', 'File')}
        </View>

        {/* Text input form */}
        {addMode === 'text' && (
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <TextInput
              label="Document Name"
              value={docName}
              onChangeText={setDocName}
              placeholder="e.g. Company FAQ"
            />
            <TextInput
              label="Content"
              value={textContent}
              onChangeText={setTextContent}
              placeholder="Paste or type your text here..."
              multiline
              numberOfLines={6}
              style={{ minHeight: 120, textAlignVertical: 'top' }}
            />
            <Button title="Add Text" onPress={handleAddText} loading={adding} icon="plus" />
          </View>
        )}

        {/* URL input form */}
        {addMode === 'url' && (
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <TextInput
              label="Document Name"
              value={docName}
              onChangeText={setDocName}
              placeholder="e.g. Pricing Page"
            />
            <TextInput
              label="URL"
              value={urlValue}
              onChangeText={setUrlValue}
              placeholder="https://example.com/page"
              keyboardType="url"
              autoCapitalize="none"
            />
            <Button title="Add URL" onPress={handleAddUrl} loading={adding} icon="plus" />
          </View>
        )}

        {/* File upload form */}
        {addMode === 'file' && (
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <TextInput
              label="Document Name"
              value={docName}
              onChangeText={setDocName}
              placeholder="e.g. Product Manual"
            />
            <TouchableOpacity
              onPress={handlePickFile}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                borderRadius: radii.md,
                paddingVertical: spacing.lg,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
              }}
            >
              <Icon
                name={selectedFile ? 'file-check-outline' : 'file-upload-outline'}
                size="lg"
                color={selectedFile ? colors.success : colors.textSecondary}
              />
              <Text
                style={{
                  ...typography.bodySmall,
                  color: selectedFile ? colors.textPrimary : colors.textSecondary,
                  marginTop: spacing.xs,
                }}
                allowFontScaling
              >
                {selectedFile ? selectedFile.name : 'Tap to pick a file'}
              </Text>
            </TouchableOpacity>
            <Button
              title="Upload File"
              onPress={handleUploadFile}
              loading={adding}
              icon="upload"
              disabled={!selectedFile}
            />
          </View>
        )}
      </Card>

      {/* Documents header */}
      {docs.length > 0 && (
        <Text
          style={{
            ...typography.bodySmall,
            color: colors.textSecondary,
            fontWeight: '600',
            marginBottom: spacing.xs,
          }}
          allowFontScaling
        >
          Your Documents
        </Text>
      )}
    </View>
  );

  return (
    <ScreenWrapper scroll={false} keyboardAvoiding={false}>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />
      <LoadingOverlay visible={deleting} message="Removing document..." />
      {successModal && (
        <SuccessModal
          visible
          title={successModal.title}
          message={successModal.message}
          onDismiss={() => setSuccessModal(null)}
        />
      )}

      <FlatList
        data={docs}
        renderItem={renderDoc}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadDocs} tintColor={colors.primary} />
        }
        contentContainerStyle={
          docs.length === 0
            ? { flexGrow: 1 }
            : { paddingBottom: spacing.xl }
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <StatusScreen
              icon="book-open-outline"
              iconColor={colors.textDisabled}
              title="No documents yet"
              subtitle="Add text, URLs, or files to give your AI agent custom knowledge it can reference during calls."
            />
          )
        }
      />

      <ConfirmSheet
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        title="Remove this document?"
        message={`"${deleteTarget?.name || 'Document'}" will be removed from your knowledge base and your AI agent will no longer reference it.`}
        icon="trash-can-outline"
        destructive
        confirmLabel="Remove"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </ScreenWrapper>
  );
}
